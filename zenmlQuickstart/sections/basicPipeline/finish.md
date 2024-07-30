# A Basic Pipeline 🌱

Nice! You just ran your first ZenML pipeline while connected to a deployed ZenML
Pro instance.

This pipeline doesn't actually do much beyond pass values between the two steps,
but it should give you a high-level overview of the basics of how to write a
pipeline:

- steps are basically just Python functions decorated with a `@step` decorator
- pipelines are also functions, but decorated with a `@pipeline` decorator
- you add type hints to the step functions to help ZenML understand and track the inputs and
  outputs of each step

Now it's time to get into a more complex pipeline where we actually do some
machine learning!
