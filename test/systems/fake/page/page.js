// The fake system's page module, for the core's tests (D-511, D-512, D-514): a card on the sheet with who is shown and what its widget gives for them, and a
// page of its own as a tab with what the same widget gives.
import { h } from "preact";

const given = (data) => (data === undefined ? "nothing yet" : `${data.who} faded ${data.fading}`);

export default {
    cards: {
        fading: { page: "sheet", title: "Fading", order: 1, widget: "rally", draw: ({ who, data }) => h("p", { class: "fake-fading" }, `${who ?? "nobody"}: ${given(data)}`) },
    },
    pages: {
        almanac: { title: "Almanac", nav: "tab", widget: "rally", draw: ({ data }) => h("p", { class: "fake-almanac" }, `Almanac: ${given(data)}`) },
    },
};
