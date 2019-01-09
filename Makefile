install:
	yarn install

sync-pages:
	git checkout gh-pages
	git merge master --ff-only
	git push origin gh-pages
	git checkout master
