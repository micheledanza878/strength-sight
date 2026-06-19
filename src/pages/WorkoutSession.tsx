import React, { useState, useEffect } from 'react';

const loadDayData = async () => {
  try {
    await loadPrevSession(day.day_name);
    // ...
  } catch (error) {
    // ...
  }
};
