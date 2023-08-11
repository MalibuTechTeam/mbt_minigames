document.addEventListener("DOMContentLoaded", (event) => {
  console.log("ARMED AND READY!");

  const gridItems = document.querySelectorAll(".grid-item");
  const sidebarDiv = document.querySelector(".sidebar");
  const minigameTime = 30;
  const charactersArray =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_-+=<>?/:;";
  let chosenItems = [];

  getWantedItems();
  console.log(chosenItems);

  fillWantedGrid(sidebarDiv);
  fillGrid(gridItems, chosenItems);

  function startTimerAndPerformAction(seconds, action) {
    let time = seconds;

    let timer = setInterval(() => {
      time--;
      console.log(time);

      if (time <= 0) {
        clearInterval(timer);
        action();
      }
    }, 1000);
  }

  function createAccessText(isGranted) {
    let container = document.getElementById("access-mess");
    let accessText = document.createElement("div");
    accessText.classList.add("access-granted");

    if (isGranted) {
      accessText.textContent = "ACCESS  GRANTED";
    } else {
      accessText.textContent = "ACCESS  DENIED";
      accessText.classList.add("access-denied");
    }

    container.appendChild(accessText);
    container.classList.add("sliding-notification");

    // accessText.style.animation = "slideIn 1.5s forwards";
  }

  function generateRandomHex() {
    let letters = "0123456789ABCDEF";
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
    let hoverSound = document.getElementById("hoverSound");
    hoverSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }

  function playErrorSound() {
    let errorSound = document.getElementById("errorSound");
    errorSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }

  function fillWantedGrid(element) {
    let interval = 20;

    async function addValueWithDelay(index) {
      if (index < chosenItems.length) {
        let item = chosenItems[index];

        console.log("item: " + item);

        let sidebarText = document.createElement("div");
        sidebarText.className = "sidebar-text";
        sidebarText.textContent = item;
        element.appendChild(sidebarText);

        await new Promise((resolve) => setTimeout(resolve, 10));
        sidebarText.classList.add("fade-in");

        await new Promise((resolve) => {
          sidebarText.addEventListener(
            "animationend",
            () => {
              resolve();
            },
            { once: true }
          );
        });

        setTimeout(() => addValueWithDelay(index + 1), interval);
      } else {
        console.log("Done!");
        console.log(chosenItems);

        startTimerAndPerformAction(minigameTime, () => {
          console.log("Time's up! Performing the action.");
          createAccessText(false);
        });
      }
    }

    addValueWithDelay(0);
  }

  function applyCharacterFillingEffect(element, chosenCharacter) {
    let interval = 100;
    let counter = 0;
    let intervalId = setInterval(() => {
      if (counter < 35) {
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
    let originalColor = gridItem.style.backgroundColor;

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

    let remainingGridItems = [...gridItems];

    let shuffledChosenItems = chosenItems.slice();
    for (let i = shuffledChosenItems.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [shuffledChosenItems[i], shuffledChosenItems[j]] = [
        shuffledChosenItems[j],
        shuffledChosenItems[i],
      ];
    }

    shuffledChosenItems.forEach((chosenValue) => {
      let randomGridIndex = Math.floor(
        Math.random() * remainingGridItems.length
      );
      let gridItem = remainingGridItems.splice(randomGridIndex, 1)[0];

      applyCharacterFillingEffect(gridItem, chosenValue);
      gridItem.innerText = chosenValue;

      gridItem.addEventListener("click", () => {
        console.log("Clicked! " + gridItem.innerText);

        if (gridItem.innerText === chosenItems[0]) {
          chosenItems.shift();
          console.log("Correct! " + chosenItems);
          gridItem.style.backgroundColor = "#03a062";

          if (chosenItems.length === 0) {
            console.log("You won!");
          }
        } else {
          console.log("You lost!");
          let flashColor = "#a81515";
          let flashDuration = 200;
          let delayBetweenFlashes = 100;

          flashGridItem(
            gridItem,
            flashColor,
            flashDuration,
            delayBetweenFlashes
          );
          playErrorSound();
        }
      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound();
      });
    });

    remainingGridItems.forEach((gridItem) => {
      let randomValue = generateRandomAlphanumeric();
      applyCharacterFillingEffect(gridItem, randomValue);
      gridItem.innerText = randomValue;

      gridItem.addEventListener("click", () => {
        console.log("Clicked! " + gridItem.innerText);
        let flashColor = "#a81515";
        let flashDuration = 200;
        let delayBetweenFlashes = 100;

        flashGridItem(gridItem, flashColor, flashDuration, delayBetweenFlashes);
        playErrorSound();
        console.log("You lost!");
      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound();
      });
    });

    PowerGlitch.glitch(".glitch");
  }
});
