# {{ app_name }}

Generated automatically by the FirstFire sync tool.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cdk bootstrap aws://$ACCOUNT/$REGION
cdk synth
cdk deploy
