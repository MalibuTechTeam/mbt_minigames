// import { PowerGlitch } from 'powerglitch'

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");

  const gridItems = document.querySelectorAll(".grid-item");
  const sidebarDiv = document.querySelector(".sidebar");
  const charactersArray =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_-+=<>?/:;";
  let chosenItems = [];

  getWantedItems();
  console.log(chosenItems);

  fillWantedGrid(sidebarDiv);
  fillGrid(gridItems, chosenItems);

  function generateRandomHex() {
    const letters = "0123456789ABCDEF";
    return letters[Math.floor(Math.random() * 16)];
  }

  function generateRandomAlphanumeric() {
    let alphanumeric = "";
    for (let i = 0; i < 2; i++) {
      alphanumeric += generateRandomHex();
    }
    return alphanumeric;
  }

  function getWantedItems() {
    for (let i = 0; i < 5; i++) {
      let randomValue = generateRandomAlphanumeric();
      chosenItems.push(randomValue);
    }
  }

  function playHoverSound() {
    const hoverSound = document.getElementById("hoverSound");
    hoverSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }

  function playErrorSound() {
    const errorSound = document.getElementById("errorSound");
    errorSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }

  function fillWantedGrid(element) {
    const interval = 20; // Delay in milliseconds

    async function addValueWithDelay(index) {
      if (index < chosenItems.length) {
        const item = chosenItems[index];

        console.log("item: " + item);

        const sidebarText = document.createElement("div");
        sidebarText.className = "sidebar-text";
        sidebarText.textContent = item;
        element.appendChild(sidebarText);

        // Trigger animation after a short delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        sidebarText.classList.add("fade-in");

        // Wait for the animation to finish
        await new Promise((resolve) => {
          sidebarText.addEventListener(
            "animationend",
            () => {
              resolve();
            },
            { once: true }
          );
        });

        // Recursively call the function to add the next value
        setTimeout(() => addValueWithDelay(index + 1), interval);
      } else {
        console.log("Done!");
        console.log(chosenItems);
      }
    }

    addValueWithDelay(0); // Start with the first index
  }

  function applyCharacterFillingEffect(element, chosenCharacter) {
    // Every 100ms, replace the content of element with a random character from charactersArray
    const interval = 100; // Delay in milliseconds
    let counter = 0;
    let intervalId = setInterval(() => {
      if (counter < 50) {
        element.innerText =
          charactersArray[Math.floor(Math.random() * charactersArray.length)] +
          charactersArray[Math.floor(Math.random() * charactersArray.length)];
        counter++;
      } else {
        clearInterval(intervalId);
        element.innerText = chosenCharacter;
      }
    }, interval);
  }

  function flashGridItem(
    gridItem,
    flashColor,
    flashDuration,
    delayBetweenFlashes
  ) {
    const originalColor = gridItem.style.backgroundColor;

    gridItem.style.backgroundColor = flashColor;

    setTimeout(() => {
      gridItem.style.backgroundColor = originalColor;
      setTimeout(() => {
        gridItem.style.backgroundColor = flashColor;
      }, delayBetweenFlashes);
    }, flashDuration);
  }

  function fillGrid(gridItems, chosenItems) {
    console.log("fillGrid");
    console.log(chosenItems);

    const remainingGridItems = [...gridItems]; // Create a copy of gridItems

    // Shuffle the chosenItems array randomly
    const shuffledChosenItems = chosenItems.slice();
    for (let i = shuffledChosenItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledChosenItems[i], shuffledChosenItems[j]] = [
        shuffledChosenItems[j],
        shuffledChosenItems[i],
      ];
    }

    // Distribute shuffled chosen items randomly across grid items
    shuffledChosenItems.forEach((chosenValue) => {
      const randomGridIndex = Math.floor(
        Math.random() * remainingGridItems.length
      );
      const gridItem = remainingGridItems.splice(randomGridIndex, 1)[0];

      applyCharacterFillingEffect(gridItem, chosenValue);
      gridItem.innerText = chosenValue;

      gridItem.addEventListener("click", () => {
        console.log("Clicked! " + gridItem.innerText);

        // Check if the clicked item is the first one in chosenItems
        if (gridItem.innerText === chosenItems[0]) {
          // Remove the first item from chosenItems
          chosenItems.shift();
          console.log("Correct! " + chosenItems);
          gridItem.style.backgroundColor = "#03a062";
          // If chosenItems is empty, the user has won
          if (chosenItems.length === 0) {
            console.log("You won!");
          }
          
        } else {
          console.log("You lost!");
          let flashColor = "#a81515"; // The color to flash
          let flashDuration = 200; // Duration of each flash in milliseconds
          let delayBetweenFlashes = 100; // Delay between consecutive flashes in milliseconds

          flashGridItem(
            gridItem,
            flashColor,
            flashDuration,
            delayBetweenFlashes
          );
          playErrorSound(); // Call a function to play the error sound
        }
      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound(); // Call a function to play the hover sound
      });
    });

    // Fill the remaining grid items with random values
    remainingGridItems.forEach((gridItem) => {
      let randomValue = generateRandomAlphanumeric(); // Assuming you have this function
      applyCharacterFillingEffect(gridItem, randomValue);
      gridItem.innerText = randomValue;

      gridItem.addEventListener("click", () => {
        console.log("Clicked! " + gridItem.innerText);
        let flashColor = "#a81515"; // The color to flash
        let flashDuration = 200; // Duration of each flash in milliseconds
        let delayBetweenFlashes = 100; // Delay between consecutive flashes in milliseconds

        flashGridItem(gridItem, flashColor, flashDuration, delayBetweenFlashes);
        playErrorSound(); // Call a function to play the error sound
        console.log("You lost!");

      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound(); // Call a function to play the hover sound
      });
    });

    PowerGlitch.glitch(".glitch");
  }
});
