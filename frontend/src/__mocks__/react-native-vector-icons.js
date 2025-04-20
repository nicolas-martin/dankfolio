// Mock component that returns null for all icon types
const mockIcon = () => null;
mockIcon.loadFont = () => Promise.resolve();

module.exports = mockIcon;