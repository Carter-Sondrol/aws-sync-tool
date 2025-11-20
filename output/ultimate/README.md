# Generated CDK App: GraphStack

Run:
```
cd output/ultimate
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Provide deployment context/parameters and synthesize
cdk synth \
  -c Account=123456789012 \
  -c ConnectInstanceID=your-connect-instance-id \
  -c ConnectBucket=your-shared-assets-bucket \
  -c TaskTemplateId=your-task-template-id

# Or pass the same values via --parameters during deploy
cdk deploy \
  --parameters AccountId=123456789012 \
  --parameters ConnectInstanceId=your-connect-instance-id \
  --parameters ConnectBucket=your-shared-assets-bucket \
  --parameters TaskTemplateId=your-task-template-id
```

`ProjectName`, `Environment`, and `Region` fall back to sensible defaults but can be
overridden with the corresponding context keys shown above.
