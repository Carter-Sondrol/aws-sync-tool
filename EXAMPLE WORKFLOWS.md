MOVE RESOURCES FROM SOURCE ACCOUNT TO FRESH TARGET ACCOUNT
- Authenticate SOURCE account in AWSync
- Add/discover starting ARN seeds
- Select resources to include/uninclude
- Mark parameters as dynamic
- Deploy to TARGET account (using correct auth) and/or export deployable package
- (Optional - Depends on if possible with given CICD process) Return updated SYNC file with ARNs from the TARGET account in the mapping table

MOVE RESOURCES FROM SOURCE ACCOUNT TO ACTIVE TARGET ACCOUNT (Direct access to both)
- Authenticate SOURCE and TARGET account in AWSync
- Add/discover starting ARN seeds to move in SOURCE
- Add/discover pre-exisiting equivilent ARNs to sync in TARGET
- Merge SOURCE resources with matching TARGET resources (or just sync parameters? Merge = shorthand to sync all parameters?)
- Make any edits to parameters/resources
- Deploy new resources to TARGET, sync linked parameters
- Update mapping with new ARNs

SAME ACCOUNT DIFFERENT CONNECT INSTANCE SYNC
- Load SOURCE connect and TARGET connect instances
- Add "account" to MAPPING table (AccountID - <Custom name (DEV/PROD/whatever)>)
- Set SOURCE refrence dyanmic to TARGET arn for new "account" map
- Deploy new resources