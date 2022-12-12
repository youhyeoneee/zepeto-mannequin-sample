import { ZepetoScriptBehaviour } from 'ZEPETO.Script';
import {ZepetoPlayers, SpawnInfo} from 'ZEPETO.Character.Controller';
import {WorldService} from 'ZEPETO.World';
import {ItemContentsRequest, Mannequin, MannequinComponent, MannequinInteractable, MannequinPreviewer} from 'ZEPETO.Mannequin';
import {Object} from "UnityEngine";

export default class MannequinScript extends ZepetoScriptBehaviour {

    private _previewer: MannequinPreviewer;

    Start() {
        ZepetoPlayers.instance.CreatePlayerWithUserId(WorldService.userId, SpawnInfo.Default, true);

        ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            var character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;
            //Add Mannequin Interactable Component
            character.gameObject.AddComponent<MannequinInteractable>();
        });

        //Find all Mannequin components
        const mannequins = Object.FindObjectsOfType<MannequinComponent>();

        mannequins.forEach(m => {
            //Enter the Collider
            m.onActive.AddListener(contents => {
                Mannequin.OpenUI(contents);
                var zepetoContext = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.Context;
                this._previewer = new MannequinPreviewer(zepetoContext, contents);
                this._previewer.PreviewContents();
            });

            //Exit the Collider
            m.onCancel.AddListener(() => {
                Mannequin.CloseUI();
                this._previewer?.ResetContents();
            });
        });
    }
}