import { colors, LobbyAction, LobbyState, LobbyEvent, RemoveSeek,
    SeekColor, MakeSeek, MappedLobbyState, AddSeek, DeleteSeek, AcceptSeek } from './commontypes';
import { h, VNode } from 'snabbdom';

export class Lobby {

    pname: string;
    state: MappedLobbyState;
    curSeekColor: SeekColor;

    emit: (action: LobbyAction) => void;

    constructor(pname: string, 
        emit: (action: LobbyAction) => void) {

        this.pname = pname;
        this.emit = emit;
        this.curSeekColor = "Random";
    }

    setState(state: LobbyState) {
        this.state = new MappedLobbyState(state);    
    }

    update(event: LobbyEvent) {
        console.log(`Receiving lobby event ${JSON.stringify(event)}`);
        
        if(event.kind === "AddSeek") {
            
            const seek = (event as AddSeek).seek;
            this.state.insert(seek);

        } else if(event.kind === "RemoveSeek") {

            const id = (event as RemoveSeek).id;
            this.state.remove(id);
        }

        console.log(`New lobby state: 
            ${JSON.stringify(this.state.toLobbyState())}`);
    }

    view(): VNode {
        return h('div', [
            this.seekTable(),
            this.seekMaker()
        ]);
    }

    seekTable(): VNode {
        return h('table', {style: {float: 'left'}},
            [h('tr', [
                h('th', "Player"),
                h('th', "Color"),
                h('th', "Action"),
            ])].concat(Array.from(this.state.seeks, 
                ([id, seek]) => h('tr', [
                    h('td', seek.player),
                    h('td', seek.color),
                    h('td', this.pname === seek.player ? 
                        [h('button', 
                            {on: {click: () => {
                                this.emit(new DeleteSeek(id));
                            }}},
                            "Delete")]
                        :
                        [h('button', 
                            {on: {click: () => {
                                this.emit(new AcceptSeek(id));
                            }}},
                            "Accept")] 
                    )
                ])
            ))
        );
    }

    seekMaker(): VNode {
        return h('div', {style: {float: 'right'}}, [
            h('div', {style: {display: 'inline'}}, 
                colors.map( (color: SeekColor) => 
                    this.makeRadioButton(color))
            ),
            h('button', {
                style: {display: 'block'},
                on: {click: () => 
                    this.emit(new MakeSeek(this.curSeekColor))}
            }, "Create Seek")
        ]);
    }

    makeRadioButton(color: SeekColor) {
        return h('span', [
            h('input', {props: {
                type: 'radio', id: color, 
                name: 'color', value: color,
                checked: color === this.curSeekColor
            }, on: {click: () => this.curSeekColor = color}}),
            h('label', {props: {for: color}}, color),
        ]);
    }

    acceptSeek(id: number) {
        return () => {

        }
    }

    deleteSeek(id: number) {
        return () => {

        }
    }
}