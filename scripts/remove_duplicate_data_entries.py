import pandas

df = pandas.read_csv("db/init/product_data.source.csv")
df = df.drop_duplicates("name")
df.to_csv("db/init/product_data.csv", index=False)
