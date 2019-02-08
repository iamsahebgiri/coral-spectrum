import './src/styles/index.css';

import OverlayMixin from './src/scripts/OverlayMixin';
import {trapFocus, returnFocus, focusOnShow, FADETIME} from './src/scripts/enums';
import {mixin} from '../coral-utils';

OverlayMixin.trapFocus = trapFocus;
OverlayMixin.returnFocus = returnFocus;
OverlayMixin.focusOnShow = focusOnShow;
OverlayMixin.FADETIME = FADETIME;

// Expose mixin on Coral namespace
mixin._overlay = OverlayMixin;

export {OverlayMixin};