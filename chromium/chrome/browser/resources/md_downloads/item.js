// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('downloads', function() {
  var Item = Polymer({
    is: 'downloads-item',

    /**
     * @param {!downloads.ThrottledIconLoader} iconLoader
     */
    factoryImpl: function(iconLoader) {
      /** @private {!downloads.ThrottledIconLoader} */
      this.iconLoader_ = iconLoader;
    },

    properties: {
      data: {
        type: Object,
      },

      hideDate: {
        type: Boolean,
        value: true,
      },

      readyPromise: {
        type: Object,
        value: function() {
          return new Promise(function(resolve, reject) {
            this.resolveReadyPromise_ = resolve;
          }.bind(this));
        },
      },

      completelyOnDisk_: {
        computed: 'computeCompletelyOnDisk_(' +
            'data.state, data.file_externally_removed)',
        type: Boolean,
        value: true,
      },

      controlledBy_: {
        computed: 'computeControlledBy_(data.by_ext_id, data.by_ext_name)',
        type: String,
        value: '',
      },

      i18n_: {
        readOnly: true,
        type: Object,
        value: function() {
          return {
            cancel: loadTimeData.getString('controlCancel'),
            discard: loadTimeData.getString('dangerDiscard'),
            pause: loadTimeData.getString('controlPause'),
            remove: loadTimeData.getString('controlRemoveFromList'),
            resume: loadTimeData.getString('controlResume'),
            restore: loadTimeData.getString('dangerRestore'),
            retry: loadTimeData.getString('controlRetry'),
            save: loadTimeData.getString('dangerSave'),
          };
        },
      },

      isActive_: {
        computed: 'computeIsActive_(' +
            'data.state, data.file_externally_removed)',
        type: Boolean,
        value: true,
      },

      isDangerous_: {
        computed: 'computeIsDangerous_(data.state)',
        type: Boolean,
        value: false,
      },

      isInProgress_: {
        computed: 'computeIsInProgress_(data.state)',
        type: Boolean,
        value: false,
      },

      showCancel_: {
        computed: 'computeShowCancel_(data.state)',
        type: Boolean,
        value: false,
      },

      showProgress_: {
        computed: 'computeShowProgress_(showCancel_, data.percent)',
        type: Boolean,
        value: false,
      },

      isMalware_: {
        computed: 'computeIsMalware_(isDangerous_, data.danger_type)',
        type: Boolean,
        value: false,
      },
    },

    observers: [
      // TODO(dbeam): this gets called way more when I observe data.by_ext_id
      // and data.by_ext_name directly. Why?
      'observeControlledBy_(controlledBy_)',
    ],

    ready: function() {
      this.content = this.$.content;
      this.resolveReadyPromise_();
    },

    /** @param {!downloads.Data} data */
    update: function(data) {
      this.data = data;

      if (!this.isDangerous_) {
        var icon = 'chrome://fileicon/' + encodeURIComponent(data.file_path);
        this.iconLoader_.loadScaledIcon(this.$['file-icon'], icon);
      }
    },

    /** @private */
    computeClass_: function() {
      var classes = [];

      if (this.isActive_)
        classes.push('is-active');

      if (this.isDangerous_)
        classes.push('dangerous');

      if (this.showProgress_)
        classes.push('show-progress');

      return classes.join(' ');
    },

    /** @private */
    computeCompletelyOnDisk_: function() {
      return this.data.state == downloads.States.COMPLETE &&
             !this.data.file_externally_removed;
    },

    /** @private */
    computeControlledBy_: function() {
      if (!this.data.by_ext_id || !this.data.by_ext_name)
        return '';

      var url = 'chrome://extensions#' + this.data.by_ext_id;
      var name = this.data.by_ext_name;
      return loadTimeData.getStringF('controlledByUrl', url, name);
    },

    /** @private */
    computeDate_: function() {
      if (this.hideDate)
        return '';
      return assert(this.data.since_string || this.data.date_string);
    },

    /** @private */
    computeDescription_: function() {
      var data = this.data;

      switch (data.state) {
        case downloads.States.DANGEROUS:
          var fileName = data.file_name;
          switch (data.danger_type) {
            case downloads.DangerType.DANGEROUS_FILE:
              return loadTimeData.getStringF('dangerFileDesc', fileName);
            case downloads.DangerType.DANGEROUS_URL:
              return loadTimeData.getString('dangerUrlDesc');
            case downloads.DangerType.DANGEROUS_CONTENT:  // Fall through.
            case downloads.DangerType.DANGEROUS_HOST:
              return loadTimeData.getStringF('dangerContentDesc', fileName);
            case downloads.DangerType.UNCOMMON_CONTENT:
              return loadTimeData.getStringF('dangerUncommonDesc', fileName);
            case downloads.DangerType.POTENTIALLY_UNWANTED:
              return loadTimeData.getStringF('dangerSettingsDesc', fileName);
          }
          break;

        case downloads.States.IN_PROGRESS:
        case downloads.States.PAUSED:  // Fallthrough.
          return data.progress_status_text;
      }

      return '';
    },

    /** @private */
    computeIsActive_: function() {
      return this.data.state != downloads.States.CANCELLED &&
             this.data.state != downloads.States.INTERRUPTED &&
             !this.data.file_externally_removed;
    },

    /** @private */
    computeIsDangerous_: function() {
      return this.data.state == downloads.States.DANGEROUS;
    },

    /** @private */
    computeIsInProgress_: function() {
      return this.data.state == downloads.States.IN_PROGRESS;
    },

    /** @private */
    computeIsMalware_: function() {
      return this.isDangerous_ &&
          (this.data.danger_type == downloads.DangerType.DANGEROUS_CONTENT ||
           this.data.danger_type == downloads.DangerType.DANGEROUS_HOST ||
           this.data.danger_type == downloads.DangerType.DANGEROUS_URL ||
           this.data.danger_type == downloads.DangerType.POTENTIALLY_UNWANTED);
    },

    /** @private */
    computeRemoveStyle_: function() {
      var canDelete = loadTimeData.getBoolean('allowDeletingHistory');
      var hideRemove = this.isDangerous_ || this.showCancel_ || !canDelete;
      return hideRemove ? 'visibility: hidden' : '';
    },

    /** @private */
    computeShowCancel_: function() {
      return this.data.state == downloads.States.IN_PROGRESS ||
             this.data.state == downloads.States.PAUSED;
    },

    /** @private */
    computeShowProgress_: function() {
      return this.showCancel_ && this.data.percent >= -1;
    },

    /** @private */
    computeTag_: function() {
      switch (this.data.state) {
        case downloads.States.CANCELLED:
          return loadTimeData.getString('statusCancelled');

        case downloads.States.INTERRUPTED:
          return this.data.last_reason_text;

        case downloads.States.COMPLETE:
          return this.data.file_externally_removed ?
              loadTimeData.getString('statusRemoved') : '';
      }

      return '';
    },

    /** @private */
    isIndeterminate_: function() {
      return this.data.percent == -1;
    },

    /** @private */
    observeControlledBy_: function() {
      this.$['controlled-by'].innerHTML = this.controlledBy_;
    },

    /** @private */
    onCancelClick_: function() {
      downloads.ActionService.getInstance().cancel(this.data.id);
    },

    /** @private */
    onDiscardDangerous_: function() {
      downloads.ActionService.getInstance().discardDangerous(this.data.id);
    },

    /**
     * @private
     * @param {Event} e
     */
    onDragStart_: function(e) {
      e.preventDefault();
      downloads.ActionService.getInstance().drag(this.data.id);
    },

    /**
     * @param {Event} e
     * @private
     */
    onFileLinkClick_: function(e) {
      e.preventDefault();
      downloads.ActionService.getInstance().openFile(this.data.id);
    },

    /** @private */
    onPauseClick_: function() {
      downloads.ActionService.getInstance().pause(this.data.id);
    },

    /** @private */
    onRemoveClick_: function() {
      downloads.ActionService.getInstance().remove(this.data.id);
    },

    /** @private */
    onResumeClick_: function() {
      downloads.ActionService.getInstance().resume(this.data.id);
    },

    /** @private */
    onRetryClick_: function() {
      downloads.ActionService.getInstance().download(this.data.url);
    },

    /** @private */
    onSaveDangerous_: function() {
      downloads.ActionService.getInstance().saveDangerous(this.data.id);
    },

    /** @private */
    onShowClick_: function() {
      downloads.ActionService.getInstance().show(this.data.id);
    },
  });

  return {Item: Item};
});