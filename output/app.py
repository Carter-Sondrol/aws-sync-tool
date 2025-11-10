#!/usr/bin/env python3
from aws_cdk import App
import importlib
import json

def load_graph(path="graph.json"):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    app = App()
    mod = importlib.import_module("graphstack")
    stack_cls = getattr(mod, "GraphStack")
    stack_cls(app, "GraphStack")
    app.synth()
    print("✅ Synth complete → cdk.out/GraphStack.template.json")

if __name__ == "__main__":
    main()