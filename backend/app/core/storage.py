import json
import os
import fcntl
import shutil
from typing import Dict, Any, Optional
from datetime import datetime
import logging
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor
import tempfile

logger = logging.getLogger(__name__)

class DataStorageError(Exception):
    """Custom exception for storage operations"""
    pass

class SafeFileStorage:
    """Thread-safe file storage with atomic operations and validation"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self._executor = ThreadPoolExecutor(max_workers=2)
        
        # Create backup directory
        self.backup_dir = self.data_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
    def _get_file_path(self, filename: str) -> Path:
        """Get full path for a data file"""
        return self.data_dir / f"{filename}.json"
    
    def _get_lock_path(self, filename: str) -> Path:
        """Get lock file path"""
        return self.data_dir / f"{filename}.lock"
    
    def _validate_data(self, data: Any) -> bool:
        """Validate data can be JSON serialized"""
        try:
            json.dumps(data, default=str)
            return True
        except (TypeError, ValueError) as e:
            logger.error(f"Data validation failed: {e}")
            return False
    
    def _create_backup(self, file_path: Path) -> Optional[Path]:
        """Create backup of existing file"""
        if not file_path.exists():
            return None
            
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"{file_path.stem}_{timestamp}.json"
        
        try:
            shutil.copy2(file_path, backup_path)
            logger.info(f"Created backup: {backup_path}")
            return backup_path
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return None
    
    def _atomic_write(self, file_path: Path, data: Any) -> None:
        """Atomically write data to file"""
        # Create temporary file in same directory
        temp_fd, temp_path = tempfile.mkstemp(
            dir=file_path.parent,
            prefix=f".{file_path.name}_",
            suffix=".tmp"
        )
        
        try:
            with os.fdopen(temp_fd, 'w') as temp_file:
                json.dump(data, temp_file, default=str, indent=2)
                temp_file.flush()
                os.fsync(temp_file.fileno())
            
            # Atomic move
            os.replace(temp_path, file_path)
            logger.debug(f"Successfully wrote {file_path}")
            
        except Exception as e:
            # Cleanup temp file on error
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise DataStorageError(f"Failed to write {file_path}: {e}")
    
    async def load_data(self, filename: str) -> Dict[str, Any]:
        """Load data from file with error handling"""
        def _load():
            file_path = self._get_file_path(filename)
            lock_path = self._get_lock_path(filename)
            
            if not file_path.exists():
                logger.info(f"File {filename} does not exist, returning empty dict")
                return {}
            
            try:
                # Use file locking for read safety
                with open(lock_path, 'w') as lock_file:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_SH)
                    
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                        logger.debug(f"Loaded {len(data)} items from {filename}")
                        return data
                        
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error in {filename}: {e}")
                # Try to restore from backup
                return self._restore_from_backup(filename)
            except Exception as e:
                logger.error(f"Failed to load {filename}: {e}")
                raise DataStorageError(f"Failed to load {filename}: {e}")
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self._executor, _load)
    
    async def save_data(self, filename: str, data: Dict[str, Any]) -> None:
        """Save data to file with validation and backup"""
        def _save():
            if not self._validate_data(data):
                raise DataStorageError(f"Invalid data for {filename}")
            
            file_path = self._get_file_path(filename)
            lock_path = self._get_lock_path(filename)
            
            try:
                # Exclusive lock for writing
                with open(lock_path, 'w') as lock_file:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
                    
                    # Create backup if file exists
                    if file_path.exists():
                        self._create_backup(file_path)
                    
                    # Atomic write
                    self._atomic_write(file_path, data)
                    logger.debug(f"Saved {len(data)} items to {filename}")
                    
            except Exception as e:
                logger.error(f"Failed to save {filename}: {e}")
                raise DataStorageError(f"Failed to save {filename}: {e}")
        
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self._executor, _save)
    
    def _restore_from_backup(self, filename: str) -> Dict[str, Any]:
        """Restore data from most recent backup"""
        backup_pattern = f"{filename}_*.json"
        backup_files = list(self.backup_dir.glob(backup_pattern))
        
        if not backup_files:
            logger.warning(f"No backup files found for {filename}")
            return {}
        
        # Get most recent backup
        latest_backup = max(backup_files, key=lambda x: x.stat().st_mtime)
        
        try:
            with open(latest_backup, 'r') as f:
                data = json.load(f)
                logger.info(f"Restored {filename} from backup {latest_backup}")
                return data
        except Exception as e:
            logger.error(f"Failed to restore from backup {latest_backup}: {e}")
            return {}
    
    def cleanup_old_backups(self, filename: str, keep_count: int = 10):
        """Clean up old backup files, keeping only the most recent ones"""
        backup_pattern = f"{filename}_*.json"
        backup_files = list(self.backup_dir.glob(backup_pattern))
        
        if len(backup_files) <= keep_count:
            return
        
        # Sort by modification time and remove oldest
        backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        files_to_remove = backup_files[keep_count:]
        
        for backup_file in files_to_remove:
            try:
                backup_file.unlink()
                logger.debug(f"Removed old backup: {backup_file}")
            except Exception as e:
                logger.warning(f"Failed to remove backup {backup_file}: {e}")

# Global storage instance
storage = SafeFileStorage()