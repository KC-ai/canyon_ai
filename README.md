Canyon AI Take home 




# Backlog

## Must Have

## Should Have

### Overall

- [ ]  Undo/Redo (everywhere)
- [ ]  auto correct leading/ trailing zeroes
- [ ]  Re factor Code to make it shorter/ more intuitive
- [ ]  Align text everywhere
- [ ]  Have light grey text in each entry for example text

### Quote Workflows

- [ ]  Sort Quotes (Pending on Top, Rejected in middle, Approved on Bottom)
- [ ]  Ability to go back and edit Rejected and undo rejections at some stages
- [ ]  Add in quote search, along with filters for pending, approved, and rejected workflows (add in custom filters later)
- [ ]  Need to prompt for message if Rejecting
- [ ]  Need to prompt for message when Approving as well
- [ ]  Always make Customer last persona in workflow
    - [ ]  if all personas before them approved then auto approve the customer step
- [ ]  When adding approvers to the workflow, only make the options personas who haven’t been added yet
- [ ]  Let people log in as different personas (once a user logs in, have them choose what their role is. based on that, preset settings for them)

**Create Quotes (AI)** 

- [ ]  Take Natural language and Design System prompt for Claude
- [ ]  Parse Claude response for properly formatted generated Quote
- [ ]  Use discount business logic for the proper workflow defaults
- [ ]  Be able to generate a “document” (Card) with the generated quote

**Current Manual Quote Creation**

- [ ]  Add in auto generated names/ id’s for them
- [ ]  Make it more simple,  Should just be the Quote ID, the Value of it, the Discount, and the Customer (+ Approval Workflows ofc)

### Insights Board

- [ ]  Build basic dashboards showing overall CPQ stats (all mock data):
    - [ ]  Avg. approval time per persona.
    - [ ]  Quotes by stage (AE, Deal Desk, CRO).
    - [ ]  % quotes approved/rejected.
    - [ ]  Any other stats you’d like to see here

## Nice to Have

### Overall

- [ ]  make it faster. Lags at some parts. (might be subscription/ concurrency issue)
- [ ]  Real time updates need to be synced with everyone

### Design

**Overall**

- [ ]  Have a tutorial/ tour on the entire product.
    - [ ]  Creation of quotes and workflows
    - [ ]  Editing of quotes and workflows
    - [ ]  What each part of the side bar does
- [ ]  Change Color Scheme
- [ ]  Make button clicks more satisfying (radiating bubble, etc)

**Landing Page** 

- [ ]  Make it more sleek and aesthetic - not just Next JS generated template

**Sidebar** 

- [ ]  Change Icons
- [ ]  Make sidebar “Toggle-able”

**Quotes**

- [ ]  Nice way to organize your quotes (e.g. Kanban board, etc)
- [ ]  Make flowchart based workflow builder for the different stages in the approval process
- [ ]  Multi Select

**Wording** 

- [ ]  Make wording more playful/ intentional

### Extra Features

- [ ]  Make custom pricing logic. And integrate that logic/ engine into the quote generation

### Deployment

- [ ]  Deploy Frontend on Vercel instead of Render
- [ ]  Deploy Backend on Railway instead of Render
