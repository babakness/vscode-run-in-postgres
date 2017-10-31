# Run Commands in Postgresql from Visual Studio Vode

The effort of this project is to set up a task processor for Postgres which will send any selected text to Postgres. This task processor is de-coupled from language files, language servers, etc. So as to allow a choice between syntax providers while keeping this functionality in place. The connection string is configured by setting

`{ "pgsql.connection": "postgres://username:password@host:port/database" } `

in your `settings.json`. If no text is selected and if the scope of the entire project is `sql` or `pgsql` then the entire content of the file is sent to postgres.

## Source Material

This work is based on the following repos:

https://github.com/doublefint/vscode-pgsql

https://github.com/jptarqu/VSCodeExtension-PostgreSQL

Project initialized as follows:
https://code.visualstudio.com/docs/extensions/example-hello-world
