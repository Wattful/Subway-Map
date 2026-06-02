import styled, {css} from "styled-components";

const AbsolutePositioned = styled.span`
    position: absolute;
    ${(props) =>
        props.left &&
        css`
            left: ${props.left};
        `}
    ${(props) =>
        props.right &&
        css`
            right: ${props.right};
        `}
    ${(props) =>
        props.top &&
        css`
            top: ${props.top};
        `}
    ${(props) =>
        props.bottom &&
        css`
            bottom: ${props.bottom};
        `}
    ${(props) =>
        props.transform &&
        css`
            transform: ${props.transform};
        `}
`;

const sizingFunction = (props, prefix, nameFunc) => {
    let top, bottom, left, right;
    if (props[`${prefix}a`]) {
        [top, bottom, left, right] = [props[`${prefix}a`], props[`${prefix}a`], props[`${prefix}a`], props[`${prefix}a`]];
    }
    if (props[`${prefix}tb`]) {
        [top, bottom] = [props[`${prefix}tb`], props[`${prefix}tb`]];
    }
    if (props[`${prefix}lr`]) {
        [left, right] = [props[`${prefix}lr`], props[`${prefix}lr`]];
    }
    if (props[`${prefix}t`]) {
        top = props[`${prefix}t`];
    }
    if (props[`${prefix}b`]) {
        bottom = props[`${prefix}b`];
    }
    if (props[`${prefix}l`]) {
        left = props[`${prefix}l`];
    }
    if (props[`${prefix}r`]) {
        right = props[`${prefix}r`];
    }
    return css`
        ${top ? `${nameFunc("top")}: ${top};` : ""}
        ${bottom ? `${nameFunc("bottom")}: ${bottom};` : ""}
        ${left ? `${nameFunc("left")}: ${left};` : ""}
        ${right ? `${nameFunc("right")}: ${right};` : ""}
    `;
};

const Margin = css`
    ${(props) => sizingFunction(props, "m", (dir) => `margin-${dir}`)}
`;

const Padding = css`
    ${(props) => sizingFunction(props, "p", (dir) => `padding-${dir}`)}
`;

const Border = css`
    ${(props) => sizingFunction(props, "b", (dir) => `border-${dir}-width`)}
`;

const Sized = styled.span`
    ${Margin}
    ${Padding}
    ${Border}
    ${(props) =>
        props.h &&
        css`
            height: ${props.h};
        `}
    ${(props) =>
        props.w &&
        css`
            width: ${props.w};
        `}
    ${(props) =>
        props.mw &&
        css`
            min-width: ${props.mw};
        `}
    ${(props) =>
        props.mh &&
        css`
            min-height: ${props.mh};
        `}
`;

const Fonted = styled.span`
    ${(props) =>
        props.fontFamily &&
        css`
            font-family: ${props.fontFamily};
        `}
    ${(props) =>
        props.fontSize &&
        css`
            font-size: ${props.fontSize};
        `}
    ${(props) =>
        props.fontStretch &&
        css`
            font-stretch: ${props.fontStretch};
        `}
    ${(props) =>
        props.fontStyle &&
        css`
            font-style: ${props.fontStyle};
        `}
    ${(props) =>
        props.fontVariant &&
        css`
            font-variant: ${props.fontVariant};
        `}
    ${(props) =>
        props.fontWeight &&
        css`
            font-weight: ${props.fontWeight};
        `}
    ${(props) =>
        props.lineHeight &&
        css`
            line-height: ${props.lineHeight};
        `}
`;

const FlexItem = styled.span`
    flex-grow: ${(props) => props.grow ?? "0"};
    flex-shrink: ${(props) => props.shrink ?? "0"};
    flex-basis: ${(props) => props.basis ?? "auto"};
`;

const FlexContainer = styled.span`
    display: ${(props) => (props.inline ? "inline-flex" : "flex")};
    ${(props) =>
        props.alignContent &&
        css`
            align-content: ${props.alignContent};
        `}
    ${(props) =>
        props.alignItems &&
        css`
            align-items: ${props.alignItems};
        `}
    ${(props) =>
        props.flexDirection &&
        css`
            flex-direction: ${props.flexDirection};
        `}
    flex-wrap: ${(props) => props.alignContent ?? "nowrap"};
    ${(props) =>
        props.justifyContent &&
        css`
            justify-content: ${props.justifyContent};
        `}
`;

export {AbsolutePositioned, Sized, Fonted, FlexItem, FlexContainer};
