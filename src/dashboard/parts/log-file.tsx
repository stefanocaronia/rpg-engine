// The file of the table's log, named under what went wrong where the player may want to report it (T-302): a quiet line, the file's path as words to copy.
import { Command } from "../settings/command.tsx";
import { t, tParts } from "../text.ts";

export function LogFile({ file }: { file: string; })
{
    return <p class="log-file">{tParts("To report the problem, attach the log file: {file}", { file: <Command text={file} name={t("Copy the log file's path")} /> })}</p>;
}
