"use client";

import { Field, inputClass } from "@/components/ui";
import CustomSelect from "@/components/CustomSelect";
import { BUILDING_COLOURS } from "@/lib/site";
import type { Location } from "@/lib/types";

/* A building's city (under its name at the top of its page, and beside it
   in the menu) and its colour (its closing sections and footer). Empty
   keeps the website's own, for a building it has in its code. Saved with
   the rest of the building. */
export default function PlaceFields({
  location,
  onChange,
}: {
  location: Pick<Location, "city" | "footer">;
  onChange: (patch: Pick<Location, "city" | "footer">) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
      <Field label="City" hint="Under its name at the top of its page, and beside it in the menu.">
        <input
          value={location.city ?? ""}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="As the website has it"
          className={inputClass}
        />
      </Field>
      <CustomSelect
        label="Colour"
        value={location.footer ?? ""}
        onChange={(footer) => onChange({ footer: footer || null })}
        options={[{ value: "", label: "As the website has it" }, ...BUILDING_COLOURS]}
      />
    </div>
  );
}
