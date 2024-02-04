const Main = imports.ui.main;
const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const Panel = imports.ui.panel;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;

let label;
let debug = false;

function logDebug(msg) {
    if (debug) {
        log(msg);
    }
}

function updateLabel() {
    logDebug("> sound-status@arvidj.eu::updateLabel");

    // Get the current sound input/output information (you need to implement this part)
    let soundInfo = getSoundInfo();

    // Update the label text
    label.text = `Output: ${soundInfo.output} | Input: ${soundInfo.input}`;

    logDebug("< sound-status@arvidj.eu::updateLabel");
}

function spawn_sync(command) {
    let [res, out, err] = GLib.spawn_command_line_sync(command);

    if (res === true) {
        out = new TextDecoder().decode(out).trim();
        return out;
    } else {
        // If there was an error, log it and return default values
        err = new TextDecoder().decode(err).trim();
        logDebug(`Error executing command (${command}), returned code ${res} with stderr: ${err}`);
        throw Error(`Error executing command: ${err}`);
    }
}

function getSoundInfo() {
    logDebug("> sound-status@arvidj.eu::getSoundinfo");
    try {
        // Spawn a child process to execute the command-line program
        let sink = spawn_sync('pactl get-default-sink');
        let sinks = JSON.parse(spawn_sync('pactl -f json list sinks'));
        let sink_name = sinks.filter((v) => v.name === sink)[0].description;

        let source = spawn_sync('pactl get-default-source');
        let sources = JSON.parse(spawn_sync('pactl -f json list sources'));
        let source_name = sources.filter((v) => v.name === source)[0].description;

        logDebug("< sound-status@arvidj.eu::getSoundinfo");
        return {
            input: source_name,
            output: sink_name
        };
    } catch (e) {
        // Handle exceptions
        logError(e, 'Error in getSoundInfo');
        logDebug("< sound-status@arvidj.eu::getSoundinfo");
        return {
            input: "Unknown",
            output: "Unknown"
        };
    }
}

function openSoundSettings() {
    // Launch GNOME sound settings
    Util.spawnCommandLine("gnome-control-center sound");
}

function init() {
    logDebug("> Initializing sound-status@arvid");
    label = new St.Label({
        text: "Loading...",
        y_expand: true,
        y_align: Clutter.ActorAlign.CENTER
    });
    logDebug("< Initializing sound-status@arvid");
}

let signalId;
let labelUpdateInterval;
const LABEL_UPDATE_DELAY = 1000;


function labelUpdateLoop() {
    updateLabel();
    labelUpdateInterval = Mainloop.timeout_add(LABEL_UPDATE_DELAY, labelUpdateLoop);
}

function enable() {
    logDebug("> Enabling sound-status@arvid");

    // Create a new PanelMenu button with the label
    let button = new PanelMenu.Button(0.0, "Sound Status");
    button.add_child(label);
    button.connect('button-press-event', openSoundSettings);

    // Add the button to the system panel
    Main.panel.addToStatusArea("sound-status", button);

    labelUpdateLoop();

    logDebug("< Enabling sound-status@arvid");
}

function disable() {
    logDebug("> Disabling sound-status@arvid");

    GLib.Source.remove(labelUpdateInterval);

    // Remove the button from the panel when the extension is disabled
    Main.panel.statusArea.quickSettings.destroy();

    logDebug("< Disabling sound-status@arvid");
}
