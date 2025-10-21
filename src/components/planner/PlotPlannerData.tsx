import { useEffect, useState } from "react";
import { getStoredPlotPlans } from "../../util";
import { LocalStorageSitePlan } from "../../types";

export function ExportPlotPlannerButton() {
    const [plotPlans, setPlotPlans] = useState<LocalStorageSitePlan[]>(getStoredPlotPlans());

    useEffect(() => {
        const handleStorageChange = () => {
            setPlotPlans(getStoredPlotPlans());
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const plotPlans_json_file = new Blob([JSON.stringify(plotPlans, null, 2)], { type: "application/json" });

    return (
        <button className="bg-btn w-full outline outline-1 p-1">
            <a
                download="plot_plans.json"
                target="_blank"
                rel="noreferrer"
                href={URL.createObjectURL(plotPlans_json_file)}
            >
                Export Plot Plans
            </a>
        </button>
    );
}

export function ImportPlotPlannerButton() {
    return (
        <label
            htmlFor="plot_plans_upload"
            className="flex justify-center items-center w-full cursor-pointer bg-btn outline outline-1 p-1 text-center"
        >
            <span>Import Plot Plans</span>
            <input
                type="file"
                accept=".json"
                id="plot_plans_upload"
                className="hidden"
                onChange={(event) => {
                    const file = (event.target.files ?? [])[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const plotPlans_json = e.target?.result as string;
                        if (window.confirm("This will overwrite your current plot plans. Are you sure you want to continue?")) {
                            try {
                                const parsed_plot_plans = JSON.parse(plotPlans_json);

                                if (!Array.isArray(parsed_plot_plans)) {
                                    throw new Error("Invalid plot plans format. Not an array.");
                                }

                                localStorage.setItem("planned_plots", plotPlans_json);
                                window.location.reload();
                            } catch (err) {
                                console.error(`error: failed to parse plot plans JSON file - ${err}`);
                                window.alert("Failed to parse plot plans. Please ensure you uploaded a properly formed JSON file.");
                            }
                        }
                    };
                    reader.onerror = () => {
                        console.error("error: failed to read plot plans file.");
                    };

                    reader.readAsText(file);
                }}
            />
        </label>
    );
}

export function ClearPlotPlannerButton() {
    return (
        <button
            className="bg-btn btn-red p-1 w-full outline outline-1"
            onClick={() => {
                if (!window.confirm("Are you sure you want to clear all plot plans? There is no way to undo this. Ensure you export your plot plans if you want to keep them.")) return;
                localStorage.setItem("planned_plots", JSON.stringify([]));
                window.location.reload();
            }}
        >
            Clear Plot Plans
        </button>
    );
}