from aws_cdk import App, Environment
from stacks import AutoStack

app = App()
AutoStack(app, "{{ stack_name }}", env=Environment(account="{{ account }}", region="{{ region }}"))
app.synth()
