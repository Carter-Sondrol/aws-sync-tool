# AWS SYNC TOOL

The main goal of this project is to create a tool that allows users to sync/deploy aws reources across multiple accounts in a pipeline/CICD agnostic way. As in, after "discovering" resources in an account, the user can then export the resources into a CDK type stack. The key thing this tool will do is allow users to "map" AWS resources across accounts to a standalone logical id. When deploying or otherwise exporting the resources, if mapped resources are found in the target account, they will be used instead of creating new resources in a stack. Instead they will be updated via the AWS API. In a fresh account, the resources can just be a normal CDK stack. The point is that regardless of if a resource was created manually, via CDK, or via another tool, it can be mapped to a logical id and syncronized across accounts. The sync tool is direction agnostic. It can sync resources from a source account to a target account, or vice versa. Very important for the common situation of prod accounts accumulating manual changes and resources causing the dev account or CFN or CDK stack to fail. Any refrences between resources will be swapped with a placeholder and dynamiocally updated at deploy time as needed.

## DESIGN

- Nodes are a complete encapsulation of a resource's data. If you have a list of nodes, you have all the data you need to recreate the visualization graph, as well as all the data you need to export the resources.
- The graph is a force graph where resources are nodes and relationships are edges.
- Selecting a node in the graph will show the node inspector panel. The node inspector panel will show the resource's data and allow the user to edit the resource's data. The node inspector panel will also show the resource's relationships and allow the user to edit the resource's relationships.
- Nodes can be marked as: 
  - Synced: Included in the sync completely with logical id mapped
  - Refrenced: Mapped to a logical id but not included in the sync (A connect instance for example may already exist and we don't want to sync settings, but we do want to sync child resources like connect flows and such)
  - External: Similar to refrenced but not mapped to a logical id, just a exactly what it says (useful for 3rd party resources like layers or AWS managed resources)
  - Ignored: Not included in the sync at all, just there for the graph visualization for the user to have a way to add/remove reosurces without deleting them or having to track down a ARN or whatnot
- The graph will be persisted to the local file system in a json file. It can also be loaded from a json file. The json file will be a list of nodes and edges plus some metadata about the graph and visualization.
- A "mapping" table will be used to mapped the logical ids to the account specific info. 
- Resource resolvers will be used to resolve the resource's data via the AWS SDK, like GetFunction, DescribeInstance, etc.
- The user can group nodes in the graph into stacks for more organizational purposes and splitting stacks.
- Synthetic nodes are nodes which don't represent a real resource in AWS, but are used to represent a relationship between resources or organize the graph - like grouping a AWS Connect Instance's subresources by type like "Connect Flows", "Connect Queues", etc.
- Nodes that are leaf nodes with a single parent can be collapsed or folded into their parent node to reduce clutter in the graph. Nodes with multiple children will have a "badge" showing the number of children.
- A tree of the graph will be shown in the sidebar for easier navigation and matches the graph visualization's collapsed state.
- A resource's parameters and settings can also be marked as per account specific or shared across all accounts. Mostly for Lambda environment variables, but could be useful for other resources as well


## Notes
The 'refrence code' folder is a collection of older versions of proof of concepts and previoyus attempts at implementing the tool