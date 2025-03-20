# Tagging Guidelines

Tags serve multiple purposes in our data catalog.
They help you, your colleagues, and external users quickly discover and organize datasets, as well as indicate which themes or topics a dataset covers.
By selecting good, consistent tags, you ensure that both you and others can locate and reuse the data more easily.
They can find your data by searching for a tag they may have found under another data set (with the same tag).

To keep things as universal and standard as possible, we strongly encourage using English for tags.
This approach broadens the audience that can understand and search for your datasets.

When adding tags under the `dcat:keyword` property, focus on making them concise and descriptive.
Single words such as `"milk"` or `"software"` often work best, but short multiword phrases like `time-series` or `"market-data"` can also be helpful.
If you’re combining multiple words, connect them with hyphens (`-`) rather than spaces (e.g. `"something like this"`) or CamelCase (e.g. `"tryNotToDoThis"`).
Typically, tags should be lowercase, unless you’re dealing with recognized abbreviations or brand names (e.g., `"GIS"`, `"FOAG"`, `"digiFLUX"`, `"DigiAgriFoodCH"` or `"eCH-0261"`).

Try to avoid overloading a single tag with too many concepts.
If you find a potential tag is very long or covers multiple topics, break it down into separate tags that are clearer and more precise.
Finally, remember there is no hard limit on how many tags you may include — just ensure each is relevant to the dataset.

Here are a few allowed examples for tags:

- `"milk"`
- `"animal-production"`
- `"time-series"`
- `"linked-data"`
- `"agricultural-report"`
- `"agricultural-policy"`
- `"eCH-0261"`
- `"digiFLUX"`
- `"DigiAgriFoodCH"`

These are all short, connected with hyphens when needed, and capitalize only recognized abbreviations or brand names.

Here are examples of keywords that you should avoid using:

- `"conservation-and-archiving-planning-aap---confederation"`: this is far too long and lumps multiple ideas into one tag. A better choice would be splitting the tag into `"conservation"`, `"archivation"` and `"confederation"`.
- `"Data standard agricultural data"`: this uses spaces instead of hyphens, is too long and capitalizes first word. A better choice would be `"data-standard"`.
- `"fertiliserProductCategory"`: this keyword uses camel case instead of hyphens. A better choice would be splitting the tag into `"fertilizer"` and `"product-category"`.

By following these guidelines, you’ll help keep our catalog organized and user-friendly, making it easier for everyone to find, understand, and reuse your data.