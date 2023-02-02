import { Sandbox, SandboxOptions, SandboxPlayer } from 'ZEPETO.Multiplay';
import { Player, Transform, Vector3 } from 'ZEPETO.Multiplay.Schema';

class CharacterItem {
    property: string;
    id: string;
}

class ChangedItem {
    sessionId: string;
    characterItems: CharacterItem[];
}

enum Cloth {
    TOP = "19",
    BOTTOM = "20" ,
    DRESS = "22"
}

export default class extends Sandbox {
    private MESSAGE_TYPE = {
        OnChangedItem: "OnChangedItem",
        SyncChangedItem: "SyncChangedItem",
        CheckChangedItem: "CheckChangedItem"
    }

    // Map<sessionId, Map<CharacterItem.property, CharacterItem.id>>
    private ChangedItems: Map<string, Map<string, string>>;

    onCreate(options: SandboxOptions) {
        // Called when the Room object is created.
        // Handle the state or data initialization of the Room object.
        this.onMessage("onChangedTransform", (client, message) => {
            const player = this.state.players.get(client.sessionId);

            const transform = new Transform();
            transform.position = new Vector3();
            transform.position.x = message.position.x;
            transform.position.y = message.position.y;
            transform.position.z = message.position.z;

            transform.rotation = new Vector3();
            transform.rotation.x = message.rotation.x;
            transform.rotation.y = message.rotation.y;
            transform.rotation.z = message.rotation.z;

            player.transform = transform;
        });
        this.onMessage("onChangedState", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            player.state = message.state;
            player.subState = message.subState; // Character Controller V2
        });

        // Mannequin server code
        this.ChangedItems = new Map<string, Map<string, string>>();

        this.onMessage<CharacterItem[]>(this.MESSAGE_TYPE.OnChangedItem, (client, message) => {
            // Overwrite clothes and set new parts
            if (this.ChangedItems.has(client.userId)) {
                const changedItemMap = this.ChangedItems.get(client.userId);
                for (const characterItem of message) {
                    if (characterItem.property == Cloth.DRESS) {
                        // In the case of a dress (22), remove the top (19) and bottom (20)
                        if (changedItemMap.has(Cloth.TOP)) {
                            changedItemMap.delete(Cloth.TOP);
                        }
                        if (changedItemMap.has(Cloth.BOTTOM)) {
                            changedItemMap.delete(Cloth.BOTTOM);
                        }
                    } else if (characterItem.property == Cloth.TOP || characterItem.property == Cloth.BOTTOM) {
                        // Remove the dress if it is a top (19) or bottom (20)
                        if (changedItemMap.has(Cloth.DRESS)) {
                            changedItemMap.delete(Cloth.DRESS);
                        }
                    }

                    changedItemMap.set(characterItem.property,characterItem.id);
                    console.log(`OnChangedItem old ${client.userId} : ${characterItem.property} // ${characterItem.id}`);
                }
            } else {
                // Initial registration
                let changedItemMap: Map<string,string> = new Map<string, string>();
                for (const characterItem of message) {
                    changedItemMap.set(characterItem.property,characterItem.id);
                }
                this.ChangedItems.set(client.sessionId,changedItemMap);
            }

            let changedItem: ChangedItem = new ChangedItem();
            changedItem.sessionId = client.sessionId;
            changedItem.characterItems = message;

            console.log(`OnChangedItem : ${changedItem.sessionId}`);
            for (const characterItem of changedItem.characterItems) {
                console.log(` ::: ${characterItem.property} - ${characterItem.id} `);
            }
            this.broadcast(this.MESSAGE_TYPE.SyncChangedItem, changedItem, {except: client});
        });

        this.onMessage<string>(this.MESSAGE_TYPE.CheckChangedItem,(client, message) => {
            if (false == this.ChangedItems.has(message)) {
                return;
            }

            let changedItem: ChangedItem = new ChangedItem();
            changedItem.sessionId = client.sessionId;
            changedItem.characterItems = [];

            for (const property of this.ChangedItems.get(message).keys()) {
                let characterItem: CharacterItem = new CharacterItem();
                characterItem.property = property;
                characterItem.id = this.ChangedItems.get(message).get(property);

                changedItem.characterItems.push(characterItem);
            }

            client.send<ChangedItem>(this.MESSAGE_TYPE.SyncChangedItem, changedItem );
        });

    }

    onJoin(client: SandboxPlayer) {

        // Create the player object defined in schemas.json and set the initial value.
        console.log(`[OnJoin] sessionId : ${client.sessionId}, HashCode : ${client.hashCode}, userId : ${client.userId}`)

        const player = new Player();
        player.sessionId = client.sessionId;

        if (client.hashCode) {
            player.zepetoHash = client.hashCode;
        }
        if (client.userId) {
            player.zepetoUserId = client.userId;
        }

        // Manage the Player object using sessionId, a unique key value of the client object.
        // The client can check the information about the player object added by set by adding the add_OnAdd event to the players object.
        this.state.players.set(client.sessionId, player);
    }

    async onLeave(client: SandboxPlayer, consented?: boolean) {

        // By setting allowReconnection, it is possible to maintain connection for the circuit, but clean up immediately in the basic guide.
        // The client can check the information about the deleted player object by adding the add_OnRemove event to the players object.
        this.state.players.delete(client.sessionId);
        if (this.ChangedItems.has(client.sessionId)) {
            this.ChangedItems.delete(client.sessionId);
        }
    }
}