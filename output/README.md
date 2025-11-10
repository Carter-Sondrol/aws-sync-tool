# AWS CDK App: GraphStack

This directory was generated automatically from a dependency graph.

## Deployment

```bash
cd output
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cdk synth
cdk deploy
```

- Graph data: `graph.json`
- Lambda handler: `lambda/graph_custom_handler.py`
- Output templates: `cdk.out/`