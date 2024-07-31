# Using the Model Control Plane 👷‍♂️

This time, running both pipelines has created two associated **model versions**.

The interesting part is that ZenML went ahead and linked all artifacts produced by the
pipelines to that model version, including the two pickle files that represent our
SGD and RandomForest classifier.

If you are a [ZenML Pro](https://zenml.io/pro) user, you can see all of this visualized in the dashboard:

<img src="/zenmlQuickstart/assets/cloud_mcp_screenshot.png" width="100%" alt="Model Control Plane">

There is a lot more you can do with ZenML models, including the ability to
track metrics by adding metadata to it, or having them persist in a model
registry. However, these topics can be explored more in the
[ZenML docs](https://docs.zenml.io).

For now, we will use the ZenML model control plane to promote our best
model to `production`. You can do this by simply setting the `stage` of
your chosen model version to the `production` tag.
