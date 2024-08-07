# Using the Model Control Plane 👷‍♂️

You can see it is relatively easy to train ML models using ZenML pipelines. But it can be somewhat clunky to track all the models produced as you develop your experiments and use-cases. Luckily, ZenML offers a _Model Control Plane_, which is a central register of all your ML models.

You can easily create a ZenML Model and associate it with your pipelines using
the `Model` object. We'll do it here for both the random forest and the SGD /
neural network models.
