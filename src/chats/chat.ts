/** A chat of the game as a host kept it: the host, its id, and the player's and the master's messages in order. */
export interface Chat
{
    host: string;
    id: string;
    messages: ChatMessage[];
}

/** A message of the player or of the master, with when it was written, ISO 8601. */
export interface ChatMessage
{
    who: "player" | "master";
    at: string;
    text: string;
}

/** A chat a host keeps on this computer: its host and id, its file, and the chat read from it; none when it is not the campaign's, or holds no message. */
export interface ChatSource
{
    host: string;
    id: string;
    path: string;
    read(): Chat | undefined;
}

/** A chat's messages with the next one of the same speaker joined to it, as the master's words before and after a tool. */
export function joinedMessages(messages: ChatMessage[]): ChatMessage[]
{
    return messages.reduce<ChatMessage[]>((joined, message) => {
        const last = joined.at(-1);

        if (last?.who === message.who) {
            last.text = `${last.text}\n\n${message.text}`;
        } else {
            joined.push({ ...message });
        }

        return joined;
    }, []);
}

/** A stretch of real time a load undid: from when the save it loaded was made to when it was loaded; what was said in it did not happen. */
export interface UndoneStretch
{
    from: string;
    to: string;
    save: number;
}

/** The stretch a load undid that a moment falls in; none when it is part of the story as it stands. */
export function undoneAt(at: string, undone: UndoneStretch[]): UndoneStretch | undefined
{
    const time = Date.parse(at);
    return undone.find((stretch) => time > Date.parse(stretch.from) && time < Date.parse(stretch.to));
}

/** A chat as the campaign keeps it: markdown, each message under who wrote it and when, in UTC as the log has it, and whether a load undid it. */
export function chatText(chat: Chat, undone: UndoneStretch[]): string
{
    const head = [`# ${chat.messages[0]?.at.slice(0, 10) ?? ""} · ${chat.host}`, "", `Written by rpg from the chat ${chat.host} keeps (${chat.id}), again as it goes on: a change made here does not last.`];
    const messages = chat.messages.map((message) => {
        const stretch = undoneAt(message.at, undone);
        const mark = stretch === undefined ? "" : ` · undone by loading save ${stretch.save}`;
        return `**${message.who === "player" ? "Player" : "Master"}** · ${message.at.slice(0, 19).replace("T", " ")} UTC${mark}\n\n${message.text.trim()}`;
    });
    return `${[head.join("\n"), ...messages].join("\n\n")}\n`;
}

// The line above each message of a kept chat: who, when, and the mark of a load that undid it.
const messageHead = /^\*\*(Player|Master)\*\* · (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC(?: · undone by loading save \d+)?$/;

/** A chat read back from the text the campaign keeps; none when the text is not one rpg wrote. */
export function readChatText(text: string): Chat | undefined
{
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const written = /^Written by rpg from the chat (\S+) keeps \(([^)]+)\)/.exec(lines[2] ?? "");

    if (written === null) {
        return undefined;
    }

    const messages: ChatMessage[] = [];

    for (const line of lines.slice(3)) {
        const head = messageHead.exec(line);
        const last = messages.at(-1);

        if (head !== null) {
            messages.push({ who: head[1] === "Player" ? "player" : "master", at: `${head[2]}T${head[3]}Z`, text: "" });
        } else if (last !== undefined) {
            last.text = `${last.text}\n${line}`;
        }
    }

    return { host: written[1] ?? "", id: written[2] ?? "", messages: messages.map((message) => ({ ...message, text: message.text.trim() })) };
}
