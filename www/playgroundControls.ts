type SelectOption = {
    value: string;
    label: string;
};

function requireElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing playground control container #${id}`);
    return element as T;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className?: string
): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    return element;
}

function createHeading(text: string): HTMLHeadingElement {
    const heading = createElement('h2');
    heading.textContent = text;
    return heading;
}

function createControlGroup(labelText: string, control: HTMLElement, labelFor?: string): HTMLDivElement {
    const group = createElement('div', 'control-group');
    const label = createElement('label');
    label.textContent = labelText;
    if (labelFor) label.htmlFor = labelFor;
    group.append(label, control);
    return group;
}

function createSeedControl(inputId: string, buttonId: string): HTMLDivElement {
    const row = createElement('div');
    row.style.display = 'flex';
    row.style.gap = '5px';

    const input = createElement('input');
    input.type = 'number';
    input.id = inputId;
    input.value = '12345';

    const button = createElement('button');
    button.type = 'button';
    button.id = buttonId;
    button.textContent = '🎲';

    row.append(input, button);
    return row;
}

function createRefreshIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M3 12a9 9 0 0 1 15.5-6.4L21 3v6h-6l2.2-2.2A7 7 0 1 0 19 12h2a9 9 0 0 1-18 0z');
    svg.append(path);
    return svg;
}

function createHueControl(labelText: string, inputId: string, buttonId: string, ariaLabel: string, value: string): HTMLDivElement {
    const group = createElement('div', 'control-group');
    const labelRow = createElement('div', 'label-row');
    const label = createElement('label');
    label.htmlFor = inputId;
    label.textContent = labelText;

    const button = createElement('button', 'icon-button');
    button.type = 'button';
    button.id = buttonId;
    button.setAttribute('aria-label', ariaLabel);
    button.append(createRefreshIcon());

    const input = createElement('input');
    input.type = 'range';
    input.id = inputId;
    input.min = '0';
    input.max = '360';
    input.value = value;

    labelRow.append(label, button);
    group.append(labelRow, input);
    return group;
}

function createSelectControl(labelText: string, selectId: string, options: SelectOption[]): HTMLDivElement {
    const select = createElement('select');
    select.id = selectId;

    for (const optionDefinition of options) {
        const option = createElement('option');
        option.value = optionDefinition.value;
        option.textContent = optionDefinition.label;
        select.append(option);
    }

    return createControlGroup(labelText, select);
}

function createCheckboxControl(inputId: string, text: string): HTMLDivElement {
    const group = createElement('div', 'control-group');
    const label = createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '10px';
    label.style.cursor = 'pointer';

    const input = createElement('input');
    input.type = 'checkbox';
    input.id = inputId;

    const span = createElement('span');
    span.textContent = text;

    label.append(input, span);
    group.append(label);
    return group;
}

function createCommandButton(id: string, text: string): HTMLButtonElement {
    const button = createElement('button');
    button.type = 'button';
    button.id = id;
    button.textContent = text;
    return button;
}

function createLinks(links: Array<{ href: string; label: string }>): HTMLDivElement {
    const stack = createElement('div', 'link-stack');
    for (const linkDefinition of links) {
        const link = createElement('a');
        link.href = linkDefinition.href;
        link.textContent = linkDefinition.label;
        stack.append(link);
    }
    return stack;
}

function createSpacer(): DocumentFragment {
    const fragment = document.createDocumentFragment();
    fragment.append(document.createElement('br'), document.createElement('br'));
    return fragment;
}

function buildCapitalControls(): void {
    const controls = requireElement<HTMLDivElement>('controls');
    const rainbowControl = createCheckboxControl(
        'rainbowCheck',
        'Rainbow Background (Test Transparency)'
    );
    rainbowControl.id = 'rainbowControl';

    controls.replaceChildren(
        createHeading('Capital Ships'),
        createControlGroup('Seed', createSeedControl('seedInput', 'randomSeedBtn')),
        createHueControl('Base Color (Hue)', 'hueInput', 'hueRefreshBtn', 'Refresh ship color', '200'),
        createSelectControl('Archetype', 'archetypeSelect', [
            { value: 'random', label: 'Random' },
            { value: 'freight', label: 'Freight' },
            { value: 'science', label: 'Science' },
            { value: 'industry', label: 'Industry' },
            { value: 'passenger', label: 'Passenger' },
            { value: 'combat', label: 'Combat' }
        ]),
        createSelectControl('Mode', 'modeSelect', [
            { value: 'full', label: 'Full Ship' },
            { value: 'shape', label: 'Structure (Wireframe)' }
        ]),
        rainbowControl,
        createCommandButton('generateBtn', 'Generate Ship'),
        createSpacer(),
        createLinks([{ href: 'element_showcase.html', label: 'Capital Ship Element Gallery' }])
    );
}

buildCapitalControls();
