"use strict";

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class PaginationManager {
  constructor(items, itemsPerPage = 10, maxLength = 1900) {
    this.items = items;
    this.itemsPerPage = itemsPerPage;
    this.maxLength = maxLength;
    this.currentPage = 0;
    this.totalPages = Math.ceil(items.length / itemsPerPage);
  }

  getCurrentPageContent() {
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageItems = this.items.slice(startIndex, endIndex);
    
    return {
      content: this.formatPageContent(pageItems),
      pageInfo: `Page ${this.currentPage + 1} of ${this.totalPages}`,
      hasNext: this.currentPage < this.totalPages - 1,
      hasPrevious: this.currentPage > 0,
    };
  }

  formatPageContent(pageItems) {
    // This method should be overridden by subclasses
    return pageItems.join('\n');
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      return true;
    }
    return false;
  }

  goToPage(page) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      return true;
    }
    return false;
  }

  createNavigationRow() {
    const row = new ActionRowBuilder();
    
    const previousButton = new ButtonBuilder()
      .setCustomId('previous')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!this.getCurrentPageContent().hasPrevious);

    const nextButton = new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!this.getCurrentPageContent().hasNext);

    row.addComponents(previousButton, nextButton);
    return row;
  }
}

export class CursorPaginationManager extends PaginationManager {
  constructor(items, cursor, hasNextPage, hasPreviousPage, fetchPageCallback) {
    super(items);
    this.cursor = cursor;
    this.hasNextPage = hasNextPage;
    this.hasPreviousPage = hasPreviousPage;
    this.fetchPageCallback = fetchPageCallback;
    this.pageHistory = [];
  }

  async nextPage() {
    if (this.hasNextPage && this.cursor) {
      this.pageHistory.push({
        items: this.items,
        cursor: this.cursor,
        hasNextPage: this.hasNextPage,
        hasPreviousPage: this.hasPreviousPage
      });
      
      const result = await this.fetchPageCallback(this.cursor, 'next');
      if (result) {
        this.items = result.items;
        this.cursor = result.cursor;
        this.hasNextPage = result.hasNextPage;
        this.hasPreviousPage = result.hasPreviousPage;
        return true;
      }
    }
    return false;
  }

  async previousPage() {
    if (this.hasPreviousPage && this.pageHistory.length > 0) {
      const previousPage = this.pageHistory.pop();
      this.items = previousPage.items;
      this.cursor = previousPage.cursor;
      this.hasNextPage = previousPage.hasNextPage;
      this.hasPreviousPage = previousPage.hasPreviousPage;
      return true;
    }
    return false;
  }

  getCurrentPageContent() {
    return {
      content: this.formatPageContent(this.items),
      pageInfo: `Page ${this.pageHistory.length + 1}`,
      hasNext: this.hasNextPage,
      hasPrevious: this.hasPreviousPage,
    };
  }
} 