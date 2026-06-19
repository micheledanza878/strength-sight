import React, { useState, useEffect } from 'react';

const loadData = async () => {
  try {
    const activePlanId = '...';
    if (!activePlanId) {
      const plan = localStorage.getItem(activePlanId);
      // ...
    }
  } catch (error) {
    // ...
  }
};
