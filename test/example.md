# Some h1 header

## And some h2 header

Lets' test how well this works with the markdown integration...

![](https://fal.media/files/tiger/wRa9DHE4Hwzxa7c_1lqYQ_b2bc0df71b6a4d26935a1294876e8a3e.jpg)

We can list a bunch of stuff:

- Item A
- Item B
- **Bold Item C**

And of course, we can use code chunks:

```json
{
    "name": "Alex",
    "age": 31
}
```

# Mermaid Diagram Example

This is an example of a Mermaid diagram rendered from Markdown:

```mermaid
%%{init: {'theme': 'forest'}}%%
gitGraph
    commit
    branch development
    checkout development
    commit
    commit
    branch feature_a
    checkout feature_a
    commit
    commit
    checkout development
    commit
    checkout feature_a
    commit
    checkout development
    merge feature_a
    checkout development
    commit
    checkout main
    merge development tag: "v1.0.0"
    checkout development
    commit

    branch feature_b
    checkout feature_b
    commit
    commit
    checkout development
    merge feature_b
    checkout main
    merge development tag: "v1.1.0"
    checkout development
    commit
    commit
    checkout main
    branch hotfix
    checkout hotfix
    commit
    checkout main
    merge hotfix tag: "v1.1.1 (bugfixes)"
```