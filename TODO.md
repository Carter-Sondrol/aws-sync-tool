Data Stuff
- Lets get a debug of the current store so we can see what is going on
- Some resources are being incorrectly marked as external
    - Lambda IAM roles shouldn't be external. Their policies might be AWS Managed, but the role itself never is iirc (double check the AWS docs)
- The resource graph should ultimately be similar to a JSON tree
    - For example something like this: {
        "some-resource": {
            "parameters": {
                "param1": "value1",
                "param2": "value2"
            },
            "links": {
                "child-resource": {
                    "type": "dependency",
                    "parameters": {
                        "param1": "value1",
                        "param2": "value2"
                    }
                },
                "refrenced-resource": {
                    "type": "reference",
                }
            }
        },
        "refrenced-resource": {
            "parameters": {
                "param1": "value1",
                "param2": "value2"
            },
            "links": {}
        }
    }
- We should probably nail down the data structures at some point
- Lazily resolve resources as they are discovered in a async manner, prioritizing the ones that are added to the sync + those that have been discovered. All resources directly shown in the graph should be resolved eventually. Ensure its interruptable so if the user adds more seeds or manually expands discovery, those get priority
- Allow locally downloading resource data, like Lambda Code or S3 files to create self-contained stacks

UI Stuff
- Node labels are way too big
- The collasping has no functionality
- In the sicover panel, use the canonical name in the selection list or at least trim the arn
- Lets group the resources by service in the reosurces sidebar
    - Worth updating the side bars to be floating panels? Dunno.
- Double clicking on a resource in the sidebar should focus the view on it in the graph
- Collasping a node should collapse all of its children, and the badge should show the number of children when collapsed.
    - Children and grand children should be collapsed when the parent is collapsed probably
    - Actually, when you collapse a node that node should attempt to hide itself in it's parent, it's collapsing all children which hides the children but not the parent. collapsing a node is basically hiding that node and its children.
- Handle non-dependent edges with collapsed nodes, changing the way the edges are drawn to the parent maybe?
    - It'd be kinda cool to have true parent/child relationships represented by shapes within shapes and expanind/collapsing the parent makes it bigger/smaller to hide/show the children. Would also naturally fit with synthetic GROUP nodes or whatnot.
- Update the resource list to be a tree and reflect the resource graph's collapse state
- Allow targeted collapsing specifc resources, like hiding all but a few or something
- Allow the editing and updating of canonical names via the details panel
- Allow the editing and updating of preoperties via the details panel

TABLE
- Implement the "sync" table
    - A table that has the data for a "sync" which is each included resource's cannonical name, account independent parameters (env vars, s3 paths, etc), and the per account ARNs
- Each row in the table should be a resource, with a column for each account, with subrows for parameters
- The table should be editable
- Used to track which accounts can use the resource with a cloudformation template vs which are direct API updates
- Source of truth for the exported CDK/CFN/JSON/"SYNC"
    - Maybe terraform eventually
    - "SYNC" is just what im calling the complete package of all the resources and their configurations, local code, scripts, whatever's needed to create a fully self contained deployment package (might be redundant with the CDK? dont recall what we can do with CDK in terms of non-cloudformation resources)