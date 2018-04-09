import '../coralui-theme-spectrum';
import '../coralui-externals';

import PanelStack from './src/scripts/PanelStack';
import Panel from './src/scripts/Panel';
import PanelContent from './src/scripts/PanelContent';

// Expose component on the Coral namespace
window.customElements.define('coral-panelstack', PanelStack);
window.customElements.define('coral-panel', Panel);

Panel.Content = PanelContent;

export {PanelStack, Panel};
