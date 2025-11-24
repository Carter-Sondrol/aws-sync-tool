# **AWS Dependency Graph Tool**

A seed-based AWS resource discovery and synchronization tool that builds a **portable dependency graph** of only the resources you explicitly care about.
It does **not** scan or replicate entire accounts. Instead, it follows real, referenced dependencies to give you an accurate, minimal graph suitable for cross-account deployment, comparison, and conversion.

---

## **⭐ Overview**

This tool helps you:

* Start from one or more **seed ARNs**
* Recursively follow only the **actual dependencies** those resources reference
  (e.g., Lambda → S3, Connect Flow → Lex Bot, Lex Bot → Lambda Alias, etc.)
* Build a **canonical dependency graph** of precisely the involved resources
* Serialize/deserialize that graph for portability
* Compare graphs across time, regions, or accounts
* Convert the graph into **CDK**, **CloudFormation**, or custom output
* Optionally **sync** the graph back into AWS using CFN/CDK or direct API calls
* Visualize, inspect, and edit the graph

The goal is to manage **logical units of infrastructure**, not entire AWS accounts.

---

## **🔍 What This Tool Is (and Isn’t)**

### **It *is***:

* A **selective**, dependency-driven resource mapper
* A way to represent AWS resources as a **clean, portable graph**
* A foundation for cross-account deploy/sync automation
* A consistent pipeline between discovery → modeling → codegen → deployment

### **It is *not***:

* An AWS account crawler
* A compliance or inventory scanner
* A “copy my entire environment” tool
* A replacement for IaC (it complements CDK/CFN; doesn’t replace them)

This is intentionally narrow so the architecture stays stable and predictable.

---

## **📐 Architecture**

The system is structured around four core components:

```
 Seeds (ARNs)
     ↓
 GraphBuilder  →  calls →  Resolvers (one per AWS service)
     ↓                           ↓
 DependencyGraph     ←     ResourceNode models
     ↓
 Operations: save/load, diff, convert, sync, visualize
```

### **1. Resolvers**

Service-specific modules that:

* Accept an ARN
* Fetch and normalize the resource
* Extract dependency ARNs

**They do not** mutate the graph or hold state.

### **2. GraphBuilder**

Owns graph construction:

* Traversal
* Node creation
* Handling deferred or missing links
* Ensuring uniqueness

It is the orchestrator for the discovery pass.

### **3. DependencyGraph**

A thin but strict storage + semantics layer:

* Stores all `ResourceNode` objects
* Manages edges
* Maintains metadata
* Handles freeze/serialize/load

No AWS calls happen here.

### **4. CLI**

A thin control layer that dispatches user intentions:

* `discover`
* `save` / `load`
* `compare`
* `convert`
* `sync`
* `visualize`

It does no business logic.

---

## **🧱 Design Principles**

These invariants should always hold:

1. **Seed-driven discovery only** — no full-account scans.
2. **Graph is the single source of truth** after discovery.
3. **Logical identity first** (portable), **physical identity second** (metadata).
4. **Resolvers produce normalized nodes only.**
5. **GraphBuilder owns all linking and insertion.**
6. **No component directly manipulates the underlying graph except GraphBuilder.**
7. **Conversion (CDK/CFN) is a projection of the same graph.**
8. **The graph must remain usable without AWS access or context.**

These principles ensure the architecture doesn’t drift into “account copier” territory.

---

## **🚀 Features (Current and Planned)**

### **Current**

* Seed-based AWS discovery
* Portable graph representation
* Graph serialization/deserialization (`freeze`)
* Diffing (graph vs graph)
* Extensible resolver architecture

### **Planned / In-progress**

* CDK/CloudFormation generation
* Sync engine:

  * CloudFormation/CDK deploy
  * Direct AWS API deployments (Connect flows, Lex bots, etc.)
* Graph editor / visualizer (TUI or web)
* Export adapters (Graphviz, Mermaid)

---

## **🛠 Example Usage**

### **Discover from a single seed ARN**

```
aws-tool discover arn:aws:lambda:us-west-2:123:function:MyFn
```

### **Discover from multiple seeds**

```
aws-tool discover --seed-file seeds.json
```

### **Save graph**

```
aws-tool save --out graph.json
```

### **Load and compare graphs**

```
aws-tool diff old.json new.json
```

### **Convert to CDK**

```
aws-graph generate --graph graph.json --output cdk-out --stack-name GraphStack
# then:
# cd cdk-out && pip install -r requirements.txt && cdk synth && cdk deploy
```

### **Sync resources**

```
aws-tool sync graph.json --target-account prod
```

---

## **🧩 Extending the Tool**

To add support for a new AWS service:

1. Create a resolver
2. Provide:

   * Resource fetch logic
   * Dependency extraction logic
   * ResourceNode normalization
3. Register the resolver

No other component needs to be changed.

---

## **📦 Repository Structure (Suggested)**

```
/cli
    commands/
/graph
    dependency_graph.py
    resource_node.py
    builder.py
/resolvers
    lambda_resolver.py
    lex_resolver.py
    connect_resolver.py
    ...
/convert
    cdk_exporter.py
    cfn_exporter.py
/sync
    sync_engine.py
/tests
README.md
```

---

## **🤝 Contributing**

Contributions are welcome, with these guidelines:

* Respect the architectural invariants
* Avoid introducing AWS-account-specific assumptions
* Keep resolver logic stateless
* Keep CLI logic thin
* Write tests for each resolver and graph behavior

Open issues or PRs anytime.

---

## **📄 License**

MIT, Apache 2.0, or your preferred license.
