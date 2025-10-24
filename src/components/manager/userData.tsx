import React, { useContext } from "react";
import { getStoredPlotPlans } from "../../util";
import {
    gordo_ls_key,
    locked_door_ls_key,
    map_node_ls_key,
    research_drone_ls_key,
    shadow_door_ls_key,
    stabilizing_gate_ls_key,
    treasure_pod_ls_key
} from "../../globals";
import { LocalStoragePin, LocalStorageSitePlan, UserData, Pin } from "../../types";
import { CurrentMapContext } from "../../CurrentMapContext";
import { useMapEvents } from "react-leaflet";

/* --- Constants --- */
const PLOT_KEY = "planned_plots";
const PINS_KEY = "user_pins";
const FOUND_KEYS = [
    gordo_ls_key,
    locked_door_ls_key,
    map_node_ls_key,
    research_drone_ls_key,
    treasure_pod_ls_key,
    stabilizing_gate_ls_key,
    shadow_door_ls_key,
] as const;

/* --- Helpers --- */
function downloadJSON(filename: string, data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* --- Export functions --- */
export function exportPlots() {
    const data = getStoredPlotPlans();
    downloadJSON("plot_plans.json", data);
}

export function exportPins() {
    const raw = localStorage.getItem(PINS_KEY) ?? "[]";
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = []; }
    downloadJSON("user_pins.json", data);
}

export function exportFoundData() {
    const out: Record<string, unknown> = {};
    for (const key of FOUND_KEYS) {
        out[key] = JSON.parse(localStorage.getItem(key) ?? "[]");
    }
    downloadJSON("found_data.json", out);
}

export function exportAll() {
    const all = {
        plots: getStoredPlotPlans(),
        pins: JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]"),
        found: FOUND_KEYS.reduce((acc: Record<string, unknown>, k) => {
            acc[k] = JSON.parse(localStorage.getItem(k) ?? "[]");
            return acc;
        }, {})
    };
    downloadJSON("sr2_interactivemap_backup.json", all);
}

/* --- Import validators --- */
function isValidPlotExport(obj: any): obj is LocalStorageSitePlan[] {
    return Array.isArray(obj) && obj.every(item => item && typeof item.site === "string" && Array.isArray(item.plotPlans));
}

function isValidPinsExport(obj: any): obj is LocalStoragePin[] {
    return Array.isArray(obj) && obj.every(p => p && typeof p.icon === "string" && p.pos && typeof p.pos.x === "number" && typeof p.pos.y === "number");
}

function isValidFoundExport(obj: unknown): obj is Record<string, any> {
    if (!obj || typeof obj !== "object") return false;
    const keys = Object.keys(obj);
    const foundKeyStrings = (FOUND_KEYS as readonly string[]);
    return keys.some(k => foundKeyStrings.includes(k)) || keys.length === FOUND_KEYS.length;
}

/* --- Import functions --- */
export async function importPlotsFile(file: File, setPlotData?: React.Dispatch<React.SetStateAction<LocalStorageSitePlan[]>>) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidPlotExport(parsed)) throw new Error("Invalid plot plans format.");
    localStorage.setItem(PLOT_KEY, JSON.stringify(parsed));
    if (typeof setPlotData === "function") {
        try { setPlotData(parsed); } catch { window.location.reload(); }
    } else {
        window.location.reload();
    }
}

export async function importPinsFile(file: File, setUserPins?: React.Dispatch<React.SetStateAction<LocalStoragePin[]>>) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidPinsExport(parsed)) throw new Error("Invalid user pins format.");
    localStorage.setItem(PINS_KEY, JSON.stringify(parsed));
    if (typeof setUserPins === "function") {
        try { setUserPins(parsed); } catch { window.location.reload(); }
    } else {
        window.location.reload();
    }
}

/* Map localStorage keys to UserData property names */
const LOCAL_TO_USERDATA: { [localKey: string]: keyof UserData } = {
    [gordo_ls_key]: "found_gordos",
    [locked_door_ls_key]: "found_locked_doors",
    [map_node_ls_key]: "found_map_nodes",
    [research_drone_ls_key]: "found_research_drones",
    [treasure_pod_ls_key]: "found_treasure_pods",
    [stabilizing_gate_ls_key]: "found_stabilizing_gates",
    [shadow_door_ls_key]: "found_shadow_doors",
};

export async function importFoundFile(file: File, setFound?: React.Dispatch<React.SetStateAction<UserData | any>>) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidFoundExport(parsed)) throw new Error("Invalid found data format.");

    // Persist uploaded data to localStorage. Accept either a combined backup
    // structure or a flat map of found keys.
    if (parsed.plots || parsed.pins || parsed.found) {
        if (parsed.plots) localStorage.setItem(PLOT_KEY, JSON.stringify(parsed.plots));
        if (parsed.pins) localStorage.setItem(PINS_KEY, JSON.stringify(parsed.pins));
        if (parsed.found) {
            for (const k of FOUND_KEYS) {
                if (parsed.found[k] !== undefined) localStorage.setItem(k, JSON.stringify(parsed.found[k]));
            }
        }
    } else {
        for (const k of FOUND_KEYS) {
            if (parsed[k] !== undefined) localStorage.setItem(k, JSON.stringify(parsed[k]));
        }
    }

    if (typeof setFound === "function") {
        try {
            const partial: Partial<UserData> = {};
            const source = parsed.found ?? parsed;

            for (const localKey of FOUND_KEYS) {
                if ((source as any)[localKey] !== undefined) {
                    const prop = LOCAL_TO_USERDATA[localKey];
                    if (prop) (partial[prop] as any) = (source as any)[localKey];
                }
            }

            // If source already used UserData property names, copy those too
            const userDataProps = Object.values(LOCAL_TO_USERDATA) as string[];
            for (const k of Object.keys(source)) {
                if (userDataProps.includes(k)) (partial as any)[k] = (source as any)[k];
            }

            setFound((prev: any) => ({ ...(prev ?? {}), ...partial }));
        } catch {
            window.location.reload();
        }
    } else {
        window.location.reload();
    }
}

/* --- Clear functions --- */
export function clearPlots(setPlotData?: React.Dispatch<React.SetStateAction<LocalStorageSitePlan[]>>) {
    localStorage.setItem(PLOT_KEY, JSON.stringify([]));
    if (typeof setPlotData === "function") setPlotData([]);
    else window.location.reload();
}

export function clearPins(setUserPins?: React.Dispatch<React.SetStateAction<LocalStoragePin[]>>) {
    localStorage.setItem(PINS_KEY, JSON.stringify([]));
    if (typeof setUserPins === "function") setUserPins([]);
    else window.location.reload();
}

export function clearFound(setFound?: React.Dispatch<React.SetStateAction<UserData | any>>) {
    for (const k of FOUND_KEYS) localStorage.setItem(k, JSON.stringify([]));
    if (typeof setFound === "function") {
        setFound((prev: any) => ({
            ...(prev ?? {}),
            found_gordos: [],
            found_locked_doors: [],
            found_map_nodes: [],
            found_research_drones: [],
            found_treasure_pods: [],
            found_stabilizing_gates: [],
            found_shadow_doors: [],
        }));
    } else {
        window.location.reload();
    }
}

export function clearAll(setPlotData?: React.Dispatch<React.SetStateAction<LocalStorageSitePlan[]>>, setUserPins?: React.Dispatch<React.SetStateAction<LocalStoragePin[]>>, setFound?: React.Dispatch<React.SetStateAction<any>>) {
    clearPlots(setPlotData);
    clearPins(setUserPins);
    clearFound(setFound);
}

export function MapUserPins({
    selected_pin,
    user_pins,
    setUserPins,
}: {
    selected_pin: Pin,
    user_pins: LocalStoragePin[],
    setUserPins: React.Dispatch<React.SetStateAction<LocalStoragePin[]>>,
}) {
    const { current_map } = useContext(CurrentMapContext);

    useMapEvents({
        click(e) {

            const new_pins = [
                ...user_pins,
                {
                    icon: selected_pin.icon,
                    pos: { x: e.latlng.lat, y: e.latlng.lng },
                    dimension: current_map,
                } as LocalStoragePin,
            ];

            setUserPins(new_pins);
            localStorage.setItem("user_pins", JSON.stringify(new_pins));
        },
    });

    return null;
}

export default function GenericDataButton({
    dataset,
    action,
    setPlotData,
    setUserPins,
    setFound,
    label
}: {
    dataset: "plots" | "pins" | "found" | "all",
    action: "export" | "import" | "clear",
    setPlotData?: React.Dispatch<React.SetStateAction<LocalStorageSitePlan[]>>,
    setUserPins?: React.Dispatch<React.SetStateAction<LocalStoragePin[]>>,
    setFound?: React.Dispatch<React.SetStateAction<UserData | any>>,
    label?: string
}) {
    const text = label ?? `${action.toUpperCase()} ${dataset.toUpperCase()}`;

     if (action === "import") {
         // render file input
         const accept = ".json";
         return (
             <label className="flex justify-center items-center w-full cursor-pointer bg-btn outline outline-1 p-1 text-center">
                 <span>{text}</span>
                 <input
                     type="file"
                     accept={accept}
                     className="hidden"
                     onChange={async (e) => {
                         const file = (e.target.files ?? [])[0];
                         if (!file) return;
                         try {
                             if (!window.confirm(`This will overwrite current ${dataset}. Continue?`)) return;
                             if (dataset === "plots") await importPlotsFile(file, setPlotData);
                             else if (dataset === "pins") await importPinsFile(file, setUserPins);
                             else if (dataset === "found") await importFoundFile(file, setFound);
                             else if (dataset === "all") {
                                 const text = await file.text();
                                 const parsed = JSON.parse(text);
                                 if (parsed.plots) localStorage.setItem(PLOT_KEY, JSON.stringify(parsed.plots));
                                 if (parsed.pins) localStorage.setItem(PINS_KEY, JSON.stringify(parsed.pins));
                                 if (parsed.found) {
                                     for (const k of FOUND_KEYS) if (parsed.found[k]) localStorage.setItem(k, JSON.stringify(parsed.found[k]));
                                 }
                                 // try setters, otherwise reload
                                 if (typeof setPlotData === "function" && parsed.plots) try { setPlotData(parsed.plots); } catch {}
                                 if (typeof setUserPins === "function" && parsed.pins) try { setUserPins(parsed.pins); } catch {}
                                 if (typeof setFound === "function" && parsed.found) try { setFound((prev: any) => ({ ...prev, ...parsed.found })); } catch {}
                                 window.location.reload();
                             }
                         } catch (err) {
                             console.error("Import failed:", err);
                             window.alert("Import failed. Check console for details.");
                         }
                     }}
                 />
             </label>
         );
     }

     // non-import actions
     return (
         <button
             className="bg-btn w-full outline outline-1 p-1"
             onClick={() => {
                 if (action === "export") {
                     if (dataset === "plots") exportPlots();
                     else if (dataset === "pins") exportPins();
                     else if (dataset === "found") exportFoundData();
                     else if (dataset === "all") exportAll();
                     else console.error("Unknown dataset for export:", dataset);
                     return;
                 }

                 // clear
                 if (!window.confirm(`Are you sure you want to clear ${dataset}? This cannot be undone.`)) return;
                 if (dataset === "plots") clearPlots(setPlotData);
                 else if (dataset === "pins") clearPins(setUserPins);
                 else if (dataset === "found") clearFound(setFound);
                 else clearAll(setPlotData, setUserPins, setFound);
             }}
         >
             {text}
         </button>
     );
}