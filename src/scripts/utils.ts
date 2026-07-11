function isSpecialClick(event: PointerEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export { isSpecialClick };
