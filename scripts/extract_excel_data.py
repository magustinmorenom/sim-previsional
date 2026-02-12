#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import xml.etree.ElementTree as ET
import zipfile

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out: list[str] = []
    for si in root.findall("a:si", NS):
        value = "".join((t.text or "") for t in si.findall(".//a:t", NS))
        out.append(value)
    return out


def parse_sheet(zf: zipfile.ZipFile, sheet_path: str) -> dict[str, dict[str, str]]:
    root = ET.fromstring(zf.read(sheet_path))
    cells: dict[str, dict[str, str]] = {}
    for cell in root.findall(".//a:c", NS):
        ref = cell.attrib.get("r")
        if not ref:
            continue
        value_node = cell.find("a:v", NS)
        formula_node = cell.find("a:f", NS)
        cells[ref] = {
            "t": cell.attrib.get("t", ""),
            "v": value_node.text if value_node is not None else "",
            "f": formula_node.text if formula_node is not None else "",
        }
    return cells


def cell_value(cells: dict[str, dict[str, str]], ref: str, shared: list[str]) -> str:
    info = cells.get(ref)
    if not info:
        return ""
    if info["t"] == "s" and info["v"]:
        idx = int(info["v"])
        return shared[idx]
    return info["v"]


def to_float(value: str) -> float:
    if value == "":
        return 0.0
    return float(value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract technical data from CEER workbook")
    parser.add_argument(
        "--xlsm",
        default="/Users/agustin/Downloads/proyectador de beneficios CEER vf 2025.xlsm",
        help="Absolute path to workbook",
    )
    parser.add_argument(
        "--outdir",
        default="data/technical/v2025",
        help="Output directory",
    )
    args = parser.parse_args()

    outdir = pathlib.Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(args.xlsm) as zf:
        shared = parse_shared_strings(zf)
        tabla = parse_sheet(zf, "xl/worksheets/sheet2.xml")
        hoja3 = parse_sheet(zf, "xl/worksheets/sheet4.xml")

    mortality_rows: list[dict[str, float | int]] = []
    for row in range(2, 3003):
        age = int(float(cell_value(tabla, f"A{row}", shared) or 0))
        mortality_rows.append(
            {
                "ageMonth": age,
                "la0": to_float(cell_value(tabla, f"B{row}", shared)),
                "la1": to_float(cell_value(tabla, f"C{row}", shared)),
                "li0": to_float(cell_value(tabla, f"D{row}", shared)),
                "li1": to_float(cell_value(tabla, f"E{row}", shared)),
                "pai0": to_float(cell_value(tabla, f"F{row}", shared)),
                "pai1": to_float(cell_value(tabla, f"G{row}", shared)),
            }
        )

    lookup_rows: list[dict[str, float | int]] = []
    for row in range(2, 43):
        age = int(float(cell_value(hoja3, f"L{row}", shared) or 0))
        factor = to_float(cell_value(hoja3, f"M{row}", shared))
        lookup_rows.append({"age": age, "factor": factor})

    metadata = {
        "version": "2025",
        "sourceWorkbook": args.xlsm,
        "sourceSheetMortality": "TABLA (sheet2)",
        "sourceSheetLookup": "Hoja3 (L2:M42)",
        "interestRateEffectiveAnnual": 0.04,
        "xminFixed": 187,
    }

    (outdir / "mortality-table.json").write_text(
        json.dumps(mortality_rows, indent=2),
        encoding="utf-8",
    )
    (outdir / "lookup-factor-table.json").write_text(
        json.dumps(lookup_rows, indent=2),
        encoding="utf-8",
    )
    (outdir / "metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(mortality_rows)} mortality rows")
    print(f"Wrote {len(lookup_rows)} lookup rows")


if __name__ == "__main__":
    main()
