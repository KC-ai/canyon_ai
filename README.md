# User Flow 

A user has the option to choose between 5 roles, based on what Persona they are. Account Executive (AE), Deal Desk, Chief Revenue Officer (CRO), Legal Team, amd Finance Team. Once all of these roles approve a quote in the workflow, the customer will receive a final approved quote.  

## Quote creation and approval workflow creation:

- Only show the workflow after natural language/ manual quote creation. After the quote object creation, save it as a draft which can be displayed on the main screen under drafts. 
- the workflow should automatically be set to Account Executive -> Deal Desk -> Legal Team -> Customer 
    - The business logic should purely be discount based for now, where Deal Desk will be added for discounts up to 15%, CRO will approve discounts from 15-40%, Legal will always be there, and Finance will be there for discounts >40%. This is the only logic, dont worry about the number values.
- Account Executive will get auto approved only when the approval workflow is submitted with “start workflow” button
- Goes without saying but the only person who has access to be able to create and terminate quotes is the Account Executive. Once the role is switched (by the dropdown) they can only approve or reject when the approval workflow is at their step

## Quotes:
- When account executive, 
    - “in progress” becomes all of the quotess that aren’t (approved, rejected, or deleted). it includes drafts and in progress
    - there’s the option to delete any quote at any time if they aren’t in approved. Any and every quote. 
        - When terminated however, there has to be a reason or a message asking why, and that message has to be displayed with the quote when its in the terminated state
    - when a quote is a draft, the options when its open become to update quote or delete it
    - When a quote is rejected, the options are to delete it, or re open it (both of those are buttons), in which case it goes back to drafts
- When any other role (other than customer, cause customer can’t even be a role), then only options are to approve or reject it. For rejection, there needs to be a reason however, so a message or note is required. 
    - Also something crucial to know is each approver CANNOT approve out of turn. So if all the steps before them haven’t been approved, then they can’t approve. They can only wait and see
- Once last approver in approval workflow (before customer) approves, then the customer step should automatically be approved, and there should be a pop up saying quote was sent to customer with a visualization of the quote document on the left, and then after that the quote should move on to the approved state.


# Backlog

- [ ] Re Factor code
- [ ] Control connection of json formatted responses of the AI generated quotes to data ingestion/ matching of manual quote creation attributes better (don't produce $NaN)
- [ ] Make faster. Lots of lag, and just refreshes every 2 seconds now
- [ ] Connect actual data to CPQ
- [ ] Add the name of the quote as some function of the quote id (that way can just display or something - brainstorm with ai)
- [ ] Resize the approval workflow on the create quote tabs to look much better resized. They’re too huge right now.
- [ ] Fix centering and aesthetics of the generation
- [ ] Add Pop Ups for EVERYTHING
- [ ] Every time a page reloads, it takes you back to home. Like I delete a quote for example, it reloads back to the home page. I need to have it reload on the page that I want
- [ ] Pop Ups every time about to terminate quote
- [ ] Make auto customer approval notification work
- [ ] Auto start in My Queue for every role?
- [ ] Make tutorial for it, so people know different roles access different things.

# Assumptions (TODO)

# Future Work (TODO)


 





