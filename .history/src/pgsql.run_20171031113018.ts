
import { window, workspace, ViewColumn, OutputChannel, Disposable } from 'vscode';
import * as ChildProcess from 'child_process';
import LineDecoder from './lineDecoder';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export default class pgsqlCommandProvider  {
    
    private executable :string = 'psql'
    private connection :string
    private outChannel : OutputChannel;
    
    public activate(subscriptions: Disposable[]) {
        let cp = this
        cp.outChannel = window.createOutputChannel("pgsql")
        workspace.onDidChangeConfiguration( cp.loadConfiguration, cp, subscriptions )
		cp.loadConfiguration()
	}
    
    public loadConfiguration():void  {
      let section = workspace.getConfiguration('pgsql')
      if (section) {
        this.connection = section.get('connection', null) as string
      }
    }

    public run():void {

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return; // No open text editor
        }
        const text = editor.document.getText(editor.selection) || editor.document.getText()
        
        const isLanguageSQL = (id:string) => ['pgsql','sql'].includes(id.toLowerCase())
        
        if(!text && !editor.document.isDirty && isLanguageSQL(editor.document.languageId) ) {

        }
        if(editor.document.isDirty || text) {
            return this.runText( text )
            
        } else {
            return this.runFile( editor.document.fileName )
        }
        
        // in any others cases, for example if ( doc.isUntitled ) 
        
        
    }
    
    // Create temporary file with given text and execute it via psql
    public runText( text: string ): void {
        
        const pgsql = this
        const rootPath = workspace.rootPath ? workspace.rootPath : __dirname
        const uniqName = path.join( rootPath, ( Date.now() - 0 ) + '.pgsql' )
        
        fs.writeFile( uniqName, text, ( err ) => {
            
           if ( err ) {
               return pgsql.outChannel.appendLine( 'Can\'t create temporary file: ' + uniqName )
           }
            
           const cb = () => fs.unlink( uniqName, ( err ) => { 
                if ( err ){
                    pgsql.outChannel.appendLine( 'Can\'t delete temporary file: ' + uniqName ) 
                }
           })
           
            pgsql.runFile( uniqName, cb )

        })

    }

    public runFile( fileName: string, cb?: Function ): void {
        
        let pgsql = this,
            args = [  
                "-d", pgsql.connection,
                "-f", fileName
            ]

        pgsql.outChannel.show( ViewColumn.Two )

        let cp = ChildProcess.spawn( pgsql.executable, args )

        if ( !cp.pid ){
            return pgsql.outChannel.appendLine( 'pgsql: can\'t spawn child process' )    
        }
        
        //args.unshift( pgsql.executable )
        //console.log( args.join(" ") )
        
        cp.on( 'error', ( err: Error ) => {
            const errObject = err as any
            let ecode: string = errObject.code
            let defmsg = `Failed to run: ${pgsql.executable} ${args.join(' ')}. ${ecode}.`
            let message: string = err.message || defmsg
            
            if (errObject.code === 'ENOENT') {
                message = `The 'psql' program was not found. Please ensure the 'psql' is in your Path`
            } 
            window.showInformationMessage( message )
            if ( cb ) cb()
        });

        
          
        let decoder = new LineDecoder()
        pgsql.outChannel.show( ViewColumn.Two )
        
        cp.stdout.on('data', (data: NodeBuffer) => {
            decoder.write(data).forEach( function (line:string) {
                pgsql.outChannel.appendLine( line )
            })
        })
        
        cp.stderr.on('data', ( data: NodeBuffer ) => {
            decoder.write( data ).forEach( function (line:string) {
                pgsql.outChannel.appendLine( line )
            })
        })

        cp.stdout.on('end', () => {
            pgsql.outChannel.appendLine('pgsql end.')
            if ( cb ) cb()
        })

    }
}