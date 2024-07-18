# 🏔️ Step 6: Use the Model Control Plane

You can see it is relatively easy to train ML models using ZenML pipelines. But it can be somewhat clunky to track all the models produced as you develop your experiments and use-cases. Luckily, ZenML offers a *Model Control Plane*, which is a central register of all your ML models.

You can easily create a ZenML Model and associate it with your pipelines using the `Model` object.

This time, running both pipelines has created two associated **model versions**.
You can list your ZenML model and their versions as follows:
