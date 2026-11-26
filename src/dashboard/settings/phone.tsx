// Playing from a phone on the home network (T-317), in Settings: the computer opens the way in, shows the code the phone scans and the address it opens,
// and closes it; the phone's own page only says that it is the phone's.
import { useEffect, useState } from "preact/hooks";
import { changePhone, type PhoneNow, readPhone } from "../api.ts";
import { Icon } from "../parts/icons.tsx";
import { Segmented } from "../parts/segmented.tsx";
import { t } from "../text.ts";
import { Command } from "./command.tsx";

/** The way in for the phone as this page knows it, read again as the player comes back to the window; what went wrong at the last change. */
export interface PhoneState
{
    now?: PhoneNow;
    problem?: string;
    /** The value chosen, shown while the change is on its way. */
    picked?: "on" | "off";
    read(): void;
    turn(open: boolean): void;
}

/** Reads the way in for the phone, and again as the player comes back to the window, as after connecting this computer to the Wi-Fi. */
export function usePhone(): PhoneState
{
    const [now, setNow] = useState<PhoneNow>();
    const [problem, setProblem] = useState<string>();
    const [picked, setPicked] = useState<"on" | "off">();

    const read = (): void => {
        void readPhone().then((read) => read !== undefined && setNow(read));
    };

    useEffect(() => {
        read();
        window.addEventListener("focus", read);
        return () => window.removeEventListener("focus", read);
    }, []);

    const turn = (open: boolean): void => {
        setPicked(open ? "on" : "off");
        setProblem(undefined);
        void changePhone(open).then((changed) => {
            setPicked(undefined);

            if ("shown" in changed) {
                setNow(changed.shown);
            } else {
                setProblem(changed.problem);
            }
        });
    };

    return { ...(now === undefined ? {} : { now }), ...(problem === undefined ? {} : { problem }), ...(picked === undefined ? {} : { picked }), read, turn };
}

/**
 * The card's rows: on the phone, that it is the phone's; on a computer on no home network, what to do and Check again; else the switch, and while it is
 * open the code to scan beside the steps, the address to copy and what to know.
 */
export function PhoneSetting({ phone }: { phone: PhoneState; })
{
    const now = phone.now;

    if (now === undefined) {
        return null;
    }

    if (now.phone) {
        return <p class="phone-here">{t("You're playing from your phone.")}</p>;
    }

    const id = "page-phone";
    const value = phone.picked ?? (now.open ? "on" : "off");
    return (
        <div class="setting">
            <div class="setting-what">
                <span class="setting-name" id={id}>{t("Phone access")}</span>
                <span class="setting-about" id={`${id}-about`}>{t("lets a phone on this computer's Wi-Fi play this game, once it scans a code")}</span>
            </div>
            {now.offline !== true && (
                <Segmented
                    label={id}
                    described={`${id}-about`}
                    options={[{ value: "off", label: t("Off") }, { value: "on", label: t("On") }]}
                    value={value}
                    onPick={(picked) => phone.turn(picked === "on")}
                />
            )}
            {now.open && now.link !== undefined && <Pairing link={now.link} />}
            <div class="setting-after">
                {now.offline === true && <Offline onLook={phone.read} />}
                <p class="setting-said problem" role="status">{phone.problem}</p>
            </div>
        </div>
    );
}

/** No home network: what to do, and a quiet button that looks again. */
function Offline({ onLook }: { onLook(): void; })
{
    return (
        <div class="setting-note fix phone-offline">
            <Icon name="offline" />
            <div class="setting-note-text">
                <p>{t("This computer is on no home network: connect it to the same Wi-Fi as the phone.")}</p>
                <p>
                    <button type="button" class="button quiet" onClick={onLook}>
                        <Icon name="update" />
                        {t("Check again")}
                    </button>
                </p>
            </div>
        </div>
    );
}

/** The way in open: the code beside the steps, the address under them to copy, then what to know. */
function Pairing({ link }: { link: string; })
{
    // A new code at each opening: the picture is asked again with it.
    const version = new URL(link).searchParams.get("code") ?? "";
    const windows = navigator.userAgent.includes("Windows");
    return (
        <div class="phone-pair">
            <img class="phone-code" src={`/api/phone/code?v=${encodeURIComponent(version)}`} alt={t("The code to scan with the phone")} width={176} height={176} />
            <div class="phone-steps">
                <ol>
                    <li>{t("Connect the phone to the same Wi-Fi as this computer.")}</li>
                    <li>{t("Scan the code with its camera, or type this address in its browser:")}</li>
                </ol>
                <Command text={link} name={t("Copy the address")} />
                <div class="setting-note phone-notes">
                    <Icon name="info" />
                    <div class="setting-note-text">
                        {windows && <p>{t("If Windows asks, allow Node.js on private networks.")}</p>}
                        <p>{t("Only on a network you trust, as your home's. Turn it off when you have finished.")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
