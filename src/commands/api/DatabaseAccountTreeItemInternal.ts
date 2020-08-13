/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { API } from '../../AzureDBExperiences';
import { DocDBAccountTreeItemBase } from '../../docdb/tree/DocDBAccountTreeItemBase';
import { ext } from '../../extensionVariables';
import { ParsedMongoConnectionString } from '../../mongo/mongoConnectionStrings';
import { MongoAccountTreeItem } from '../../mongo/tree/MongoAccountTreeItem';
import { ParsedConnectionString } from '../../ParsedConnectionString';
import { ParsedPostgresConnectionString } from '../../postgres/postgresConnectionStrings';
import { PostgresServerTreeItem } from '../../postgres/tree/PostgresServerTreeItem';
import { nonNullProp } from '../../utils/nonNull';
import { DatabaseAccountTreeItem } from '../../vscode-cosmosdb.api';

export class DatabaseAccountTreeItemInternal implements DatabaseAccountTreeItem {
    protected _parsedCS: ParsedConnectionString;
    // tslint:disable-next-line: no-any
    protected _apiType: any;
    private _accountNode: MongoAccountTreeItem | DocDBAccountTreeItemBase | PostgresServerTreeItem | undefined;

    constructor(parsedCS: ParsedConnectionString, accountNode?: MongoAccountTreeItem | DocDBAccountTreeItemBase | PostgresServerTreeItem) {
        this._parsedCS = parsedCS;
        this._accountNode = accountNode;
        if (accountNode instanceof MongoAccountTreeItem) {
            this._apiType = API.MongoDB;
        } else if (accountNode instanceof DocDBAccountTreeItemBase) {
            this._apiType = API.Core;
        } else {
            this._apiType = API.Postgres;
        }
    }

    public get connectionString(): string {
        return this._parsedCS.connectionString;
    }

    public get hostName(): string {
        return this._parsedCS.hostName;
    }

    public get port(): string {
        if (!this._parsedCS.port && this._apiType === API.Postgres) {
            return '5432';
        }
        return this._parsedCS.port;
    }

    public get azureData(): { accountName: string; } | undefined {
        if (this._accountNode instanceof MongoAccountTreeItem && this._accountNode instanceof DocDBAccountTreeItemBase) {
            if (this._accountNode?.databaseAccount) {
                return {
                    accountName: nonNullProp(this._accountNode.databaseAccount, 'name')
                };
            }
        } else if (this._accountNode instanceof PostgresServerTreeItem) {
            return {
                accountName: nonNullProp(this._accountNode, 'name')
            };
        }
        return undefined;
    }

    public get docDBData(): { masterKey: string; documentEndpoint: string; } | undefined {
        if (this._accountNode instanceof DocDBAccountTreeItemBase) {
            return {
                documentEndpoint: this._accountNode.root.documentEndpoint,
                masterKey: this._accountNode.root.masterKey
            };
        } else {
            return undefined;
        }
    }

    public get postgresData(): { username: string; password: string } | undefined {
        if (this._accountNode instanceof PostgresServerTreeItem) {
            const connectionString = this._accountNode.connectionString;
            return {
                username: connectionString.username,
                password: connectionString.password
            };
        } else {
            return undefined;
        }
    }

    public async reveal(): Promise<void> {
        ext.treeView.reveal(await this.getAccountNode());
    }

    protected async getAccountNode(): Promise<MongoAccountTreeItem | DocDBAccountTreeItemBase | PostgresServerTreeItem> {
        // If this._accountNode is undefined, attach a new node based on connection string
        if (!this._accountNode) {
            // tslint:disable-next-line: no-any
            let apiType: any;
            if (this._parsedCS instanceof ParsedMongoConnectionString) {
                apiType = API.MongoDB;
            } else if (this._parsedCS instanceof ParsedPostgresConnectionString) {
                apiType = API.Postgres;
            } else {
                apiType = API.Core;
            }
            this._accountNode = await ext.attachedAccountsNode.attachConnectionString(this.connectionString, apiType);
        }

        return this._accountNode;
    }
}
