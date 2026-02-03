import Modifier from 'ember-modifier';

export default class GlossaryPopoverModifier extends Modifier {
  currentPopover = null;
  currentTermElement = null;
  glossaryInitialized = false;
  setupTimer = null;
  
  didReceiveArguments() {
    if (!this.glossaryInitialized) {
      this.setupGlossaryTerms();
      this.glossaryInitialized = true;
    }
  }
  
  willDestroy() {
    this.closePopover();
    
    // Remove global event listeners to prevent memory leaks
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.setupTimer) {
      clearTimeout(this.setupTimer);
      this.setupTimer = null;
    }
    
    this.glossaryInitialized = false;
  }
  
  setupGlossaryTerms() {
    // Wait for DOM to be fully ready
    this.setupTimer = setTimeout(() => {
      if (this.isDestroying || this.isDestroyed) {
        return;
      }

      const glossaryTerms = this.element.querySelectorAll('.glossary-term');
      if (glossaryTerms.length === 0) {
        return;
      }
      
      glossaryTerms.forEach((term) => {
        this.attachTermListeners(term);
      });
      
      // Global click handler to close popover when clicking outside
      this.clickHandler = (e) => {
        if (this.currentPopover && 
            !e.target.closest('.glossary-popover') && 
            !e.target.closest('.glossary-term')) {
          this.closePopover();
        }
      };
      document.addEventListener('click', this.clickHandler);
      
      // Scroll handler to reposition popover
      this.scrollHandler = () => {
        if (this.currentPopover && this.currentTermElement) {
          this.positionPopover(this.currentTermElement, this.currentPopover);
        }
      };
      window.addEventListener('scroll', this.scrollHandler);
      
      // Resize handler to close popover
      this.resizeHandler = () => {
        if (this.currentPopover) {
          this.closePopover();
        }
      };
      window.addEventListener('resize', this.resizeHandler);
    }, 50);
  }
  
  attachTermListeners(term) {
    term.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.currentPopover && this.currentTermElement === term) {
        this.closePopover();
        return;
      }
      
      this.openPopover(term);
    });
    
    term.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this.currentPopover && this.currentTermElement === term) {
          this.closePopover();
          return;
        }
        this.openPopover(term);
      }
      if (e.key === 'Escape' && this.currentPopover) {
        this.closePopover();
      }
    });
  }
  
  openPopover(trigger) {
    this.closePopover();
    
    const termText = trigger.dataset.glossaryTerm;
    const termTitle = trigger.dataset.glossaryTitle || termText;
    const description = trigger.dataset.glossaryDesc;
    const url = trigger.dataset.glossaryUrl;
    const linkText = trigger.dataset.glossaryLinkText || 'Learn more';
    const popoverId = trigger.dataset.glossaryPopoverId;
    
    const popover = document.createElement('div');
    popover.className = 'glossary-popover';
    popover.id = popoverId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'false');
    popover.setAttribute('aria-labelledby', `${popoverId}-title`);
    popover.tabIndex = -1;
    
    let popoverHTML = `<div class="glossary-popover-header" id="${popoverId}-title">${this.escapeHtml(termTitle)}</div>`;
    
    const hasDescription = description && description.trim().length > 0;
    if (hasDescription) {
      popoverHTML += `<div class="glossary-popover-body" id="${popoverId}-desc">${this.escapeHtml(description)}</div>`;
    }
    
    popoverHTML += '<div class="glossary-popover-footer">';
    if (url) {
      popoverHTML += `<a href="${this.escapeHtml(url)}" class="text-primary" target="_blank" rel="noopener">${this.escapeHtml(linkText)} →</a>`;
    } else {
      popoverHTML += '<span></span>';
    }
    popoverHTML += '<button type="button" class="glossary-close-btn" aria-label="Close glossary popover">Close</button></div>';
    
    popover.innerHTML = popoverHTML;
    if (hasDescription) {
      popover.setAttribute('aria-describedby', `${popoverId}-desc`);
    }
    
    document.body.appendChild(popover);
    this.positionPopover(trigger, popover);
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', popoverId);
    
    setTimeout(() => {
      popover.classList.add('show');
      popover.focus();
    }, 10);
    
    const closeButton = popover.querySelector('.glossary-close-btn');
    closeButton.addEventListener('click', () => this.closePopover());
    
    popover.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closePopover();
      }
    });
    
    // Trap focus within the popover
    const focusableElements = popover.querySelectorAll('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      
      popover.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable.focus();
            }
          }
        }
      });
    }
    
    this.currentPopover = popover;
    this.currentTermElement = trigger;
  }
  
  closePopover() {
    if (!this.currentPopover) {
      return;
    }
    
    this.currentPopover.classList.remove('show');
    if (this.currentTermElement) {
      this.currentTermElement.setAttribute('aria-expanded', 'false');
      this.currentTermElement.removeAttribute('aria-controls');
    }
    
    setTimeout(() => {
      if (this.currentPopover && this.currentPopover.parentNode) {
        this.currentPopover.parentNode.removeChild(this.currentPopover);
      }
      if (this.currentTermElement) {
        this.currentTermElement.focus();
      }
      this.currentPopover = null;
      this.currentTermElement = null;
    }, 150);
  }
  
  positionPopover(termElement, popover) {
    const rect = termElement.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;
    
    if (rect.bottom + popoverRect.height + 8 > window.innerHeight) {
      top = rect.top + window.scrollY - popoverRect.height - 8;
    }
    
    if (left + popoverRect.width > window.innerWidth) {
      left = window.innerWidth - popoverRect.width - 16;
    }
    
    if (left < 8) {
      left = 8;
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
