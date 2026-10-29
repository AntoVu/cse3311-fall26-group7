# Indoor reviews

One file per building you reviewed, saved from the Indoor Digitizer with **Save this building**: `NH.json`,
`residence-west-hall.json`, and so on. Commit it here on your own branch and open a pull request. Change nothing
else: Anthony merges the reviews into `src/data/indoor-edits.json` with

```sh
npm run merge:reviews   # folds indoor-reviews/*.json into src/data/indoor-edits.json
npm run import:osm      # rebuilds the indoor routing data
npm test
```

One building is reviewed in one file. If two files hold the same building, `merge:reviews` stops and names them.
