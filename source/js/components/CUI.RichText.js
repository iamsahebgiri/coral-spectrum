(function($) {

    var configs = { };

    CUI.RichText = new Class(/** @lends CUI.RichText# */ {

        toString:'RichText',

        extend:CUI.Widget,

        editorKernel: null,

        savedSpellcheckAttrib: null,

        savedOutlineStyle: null,

        isActive: false,


        /**
         * Flag to ignore the next "out of area" click event
         * @private
         * @type Boolean
         */
        ignoreNextClick: false,


        construct: function(options) {
            this.options = options || { };
            // TODO ...
        },

        // Helpers -----------------------------------------------------------------------------------------------------

        _hidePopover: function() {
            if (this.editorKernel.toolbar) {
                var tb = this.editorKernel.toolbar;
                if (tb._hidePopover) {
                    return tb._hidePopover();
                }
            }
            return false;
        },

        getTextDiv: function(parentEl) {
            return parentEl;
        },

        isEmptyText: function() {
            return false;
            /*
            var spanDom = CQ.Ext.DomQuery.selectNode("span:first", this.textContainer);
            if (!spanDom) {
                return false;
            }
            var spanEl = CQ.Ext.get(spanDom);
            return spanEl.hasClass(CQ.themes.TextEditor.EMPTY_COMPONENT_CLASS);
            */
        },

        prepareForNewText: function() {
            /*
            CQ.form.rte.Common.removeAllChildren(this.textContainer);
            */
        },

        handleKeyUp: function(e) {
            // if (!window.CQ_inplaceEditDialog) {
                if (e.getCharCode() === 27) {
                    this.finish();
                }
            // }
        },

        initializeEditorKernel: function(initialContent) {
            this.editorKernel.addUIListener("updatestate", this.updateState, this);
            this.editorKernel.addUIListener("dialogshow", this.onDialogShow, this);
            this.editorKernel.addUIListener("dialoghide", this.onDialogHide, this);
            this.editorKernel.initializeEditContext(window, document, this.textContainer);
            this.editorKernel.initializeEventHandling();
            this.editorKernel.setUnprocessedHtml(initialContent || "");
            this.editorKernel.initializeCaret(true);
            this.editorKernel.execCmd("initializeundo");
        },

        initializeEventHandling: function() {
            var sel = CUI.rte.Selection;
            var self = this;
            var $body = $(document.body);
            // temporary focus handling - we need to retransfer focus immediately
            // to the text container (at least in iOS 6) to prevent the keyboard from
            // disappearing and losing the focus altogether
            var editContext = this.editorKernel.getEditContext();
            $body.on("focus.rte", ".rte-toolbar-item", function(e) {
                self.$textContainer.focus();
                e.stopPropagation();
                e.preventDefault();
            });
            this.$textContainer.finger("blur.rte", function(e) {
                // get back in a few milliseconds and see if it was a temporary focus
                // change (if a toolbar button was invoked) and finish otherwise -
                // this is the case on mobile devices if the on-screen keyboard gets
                // hidden
                CUI.rte.Utils.defer(function() {
                    if (!self.isTemporaryFocusChange && self.isActive) {
                        self.finish();
                    }
                    self.isTemporaryFocusChange = false;
                }, 10);
            });
            // additional keyboard handling
            CUI.rte.Eventing.on(editContext, document.body, "keyup", this.handleKeyUp,
                    this);
            // handle clicks/taps (clicks on the editable div vs. common/"out of area"
            // clicks vs. clicks on toolbar items)
            this.$textContainer.fipo("tap.rte", "click.rte", function(e) {
                e.stopPropagation();
            });
            var bookmark;
            $body.fipo("touchstart.rte.ooa", "mousedown.rte.ooa", function(e) {
                // we need to save the bookmark as soon as possible, as it gets lost
                // somewhere in the event handling between the initial touchstart/mousedown
                // event and the tap/click event where we actually might need it
                var context = self.editorKernel.getEditContext();
                bookmark = sel.createRangeBookmark(context);
            });
            $body.on("click.rte.ooa", function(e) {
                // there are cases where "out of area clicks" must be ignored - for example,
                // on touch devices, the initial tap is followed by a click event that
                // would stop editing immediately; so the ignoreNextClick flag may be
                // used to handle those cases
                if (self.ignoreNextClick) {
                    self.ignoreNextClick = false;
                    return;
                }
                // TODO find a cleaner solution ...
                if (self._hidePopover()) {
                    var context = self.editorKernel.getEditContext();
                    self.editorKernel.focus(context);
                    // restore the bookmark that was saved on the initial
                    // touchstart/mousedown event
                    if (bookmark) {
                        sel.selectRangeBookmark(context, bookmark);
                        bookmark = undefined;
                    }
                    self.isTemporaryFocusChange = true;
                    e.preventDefault();
                    e.stopPropagation();
                } else if (self.isActive) {
                    self.finish();
                }
            });
            $body.finger("tap.rte.ooa", function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            // prevent losing focus for toolbar items
            $body.fipo("tap.rte.item", "click.rte.item", ".rte-toolbar .item", function(e) {
                self.isTemporaryFocusChange = true;
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            // prevent losing focus for popovers
            $body.fipo("tap.rte.item", "click.rte.item", ".rte-popover .item", function(e) {
                self.isTemporaryFocusChange = true;
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
        },

        deactivateEditorKernel: function() {
            if (this.editorKernel != null) {
                this.editorKernel.removeUIListener("updatestate");
                this.editorKernel.removeUIListener("dialogshow");
                this.editorKernel.removeUIListener("dialoghide");
                this.editorKernel.suspendEventHandling();
                this.editorKernel.destroyToolbar();
            }
        },

        finalizeEventHandling: function() {
            CUI.rte.Eventing.un(document.body, "keyup", this.handleKeyUp, this);
            this.$textContainer.off("blur.rte tap.rte click.rte");
            var $body = $(document.body);
            $body.off("focus.rte tap.rte.ooa click.rte.ooa touchstart.rte.ooa");
            $body.off("mousedown.rte.ooa tap.rte.item click.rte.item");
        },

        updateState: function() {
            this.editorKernel.updateToolbar();
        },

        onDialogShow: function() {
            /*
            var context = this.editorKernel.getEditContext();
            this.savedSelection = this.editorKernel.createQualifiedRangeBookmark(context);
            this.editorKernel.disableEventHandling();
            window.CQ_inplaceEditDialog = true;
            */
        },

        onDialogHide: function() {
            /*
            CQ.form.rte.Utils.defer(function() {
                window.CQ_inplaceEditDialog = false;
                this.editorKernel.reenableEventHandling();
                var context = this.editorKernel.getEditContext();
                this.editorKernel.selectQualifiedRangeBookmark(context, this.savedSelection);
            }, 1, this);
            */
        },


        // Interface ---------------------------------------------------------------------------------------------------

        start: function(config, toolbarRoot) {
            if (this.editorKernel === null) {
                this.editorKernel = new CUI.rte.DivKernel(config);
            }
            var ua = CUI.rte.Common.ua;
            this.ignoreNextClick = ua.isTouch;
            this.$textContainer = this.getTextDiv(this.$element);
            this.$textContainer.addClass("edited");
            this.textContainer = this.$textContainer[0];
            toolbarRoot = toolbarRoot || this.$textContainer.parent();
            this.editorKernel.createToolbar({
                $toolbarRoot: $(toolbarRoot)
            });
            /*
            this.currentSize = this.textContainer.getSize();
            var pos = el.getXY();
            this.currentPosition = {
                "x": pos[0],
                "y": pos[1]
            };
            */
            // if the component includes the "empty text placeholder", the placeholder
            // has to be removed and prepared for richtext editing
            this.isEmptyContent = this.isEmptyText();
            if (this.isEmptyContent) {
                this.prepareForNewText();
            }
            this.savedSpellcheckAttrib = document.body.spellcheck;
            document.body.spellcheck = false;
            this.initializeEventHandling();
            var initialContent = this.options.initialContent || this.$textContainer.html();
            this.$textContainer[0].contentEditable = "true";
            if (ua.isGecko || ua.isWebKit) {
                this.savedOutlineStyle = this.textContainer.style.outlineStyle;
                this.textContainer.style.outlineStyle = "none";
            }
            this.initializeEditorKernel(initialContent);
            this.isActive = true;
        },

        finish: function() {
            var editedContent = this.editorKernel.getProcessedHtml();
            this.finalizeEventHandling();
            this.deactivateEditorKernel();
            this.$textContainer.removeClass("edited");
            this.textContainer.blur();
            this.textContainer.contentEditable = "inherit";
            document.body.spellcheck = this.savedSpellcheckAttrib;
            var ua = CUI.rte.Common.ua;
            if ((ua.isGecko || ua.isWebKit) && this.savedOutlineStyle) {
                this.textContainer.style.outlineStyle = this.savedOutlineStyle;
            }
            this.isActive = false;
            return editedContent;
        }

    });

    // Register ...
    CUI.util.plugClass(CUI.RichText, "richEdit", function(rte) {
        var configPath = $(this).attr("data-config");
        var config;
        if (configs.hasOwnProperty(configPath)) {
            config = configs[configPath];
            rte.start(config);
        } else {
            $.getJSON(configPath, function(data) {
                configs[configPath] = data;
                rte.start(data);
            });
        }

    });

    // Data API
    if (CUI.options.dataAPI) {
        $(function () {
            $('body').fipo('tap.rte.data-api', 'click.rte.data-api', '.editable',
                    function (e) {
                        var $this = $(this);
                        if (!$this.hasClass("edited")) {
                            $this.richEdit();
                            e.preventDefault();
                        }
                    });
        });
    }

}(window.jQuery));


