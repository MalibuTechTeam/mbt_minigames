document.addEventListener("DOMContentLoaded", (event) => {
  let gridItems = document.querySelectorAll(".grid-item");
  const sidebarDiv = document.querySelector(".sidebar");
  const gridContainer = document.querySelector('.grid-container');

  let minigameTime = 10;
  const charactersArray =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_-+=<>?/:;";
  let chosenItems = [];
  let activeSessionId = null;
  let timer = null;

  const fetchNUI = async (cbname, data) => {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(data),
    };
    const resp = await fetch(`https://${GetParentResourceName()}/${cbname}`, options);
    return await resp.json();
  };

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (data.Action === "handleUI") {
      handleDisplay(data);
    }
  });

  function handleDisplay(data) {
    let display = data.Status;
    if (display === true) {
      activeSessionId = data.Payload.Id;
      minigameTime = data.Payload.TimeLimit;
      getWantedItems();
      setTimeout(() => {
        document.body.style.display = "flex";
        createGrid();
        fillWantedGrid(sidebarDiv);
        fillGrid(chosenItems);
      }, 150);
    } else {
      document.body.style.display = "none";
      document.querySelector('.sidebar').innerHTML = "";
      document.getElementById("access-mess").innerHTML = "";
      document.getElementById("access-mess").classList.remove("sliding-notification");
      document.getElementById("timer").text = "?";

      emptyGrid()
      chosenItems = [];
    }
  }

  function createGrid() {
    for (let i = 0; i < 56; i++) {
      let gridItem = document.createElement('div');
      gridItem.classList.add('grid-item', 'glowing-text');
      gridContainer.appendChild(gridItem);
    }
  }

  function emptyGrid() {
    gridContainer.innerHTML = "";
  }

  function startTimerAndPerformAction(seconds, action) {
    let time = seconds;

    timer = setInterval(() => {
      time--;
      document.getElementById("timer").textContent = time;

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

  function playSuccessSound() {
    let successSound = document.getElementById("successSound");
    successSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }

  function playFailedSound() {
    let failedSound = document.getElementById("failedSound");
    failedSound.play().catch((error) => {
      console.error("Audio play error:", error);
    });
  }
  function fillWantedGrid(element) {
    let interval = 20;

    async function addValueWithDelay(index) {
      if (index < chosenItems.length) {
        let item = chosenItems[index];
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
        startTimerAndPerformAction(minigameTime, () => {
          createAccessText(false);
          fetchNUI("hackingEnd", { outcome: false, sessionId: activeSessionId });
          playFailedSound();
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
    gridItem.classList.add("wrong");

    setTimeout(() => {
      gridItem.style.backgroundColor = originalColor;
      gridItem.classList.remove("wrong");

      setTimeout(() => {
        gridItem.classList.add("wrong");
      }, delayBetweenFlashes);
    }, flashDuration);
  }

  function fillGrid(chosenItems) {
    let gridItems = document.querySelectorAll(".grid-item");
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

      gridItem.classList.remove("selected");
      gridItem.classList.remove("wrong");

      applyCharacterFillingEffect(gridItem, chosenValue);

      gridItem.innerText = chosenValue;

      gridItem.addEventListener("click", () => {
        if (gridItem.innerText === chosenItems[0]) {
          chosenItems.shift();
          gridItem.classList.add("selected");

          if (chosenItems.length === 0) {
            createAccessText(true);
            fetchNUI("hackingEnd", { outcome: true, sessionId: activeSessionId });
            playSuccessSound();
            clearInterval(timer);
          }
        } else {
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
          clearInterval(timer);
          createAccessText(false);
          fetchNUI("hackingEnd", { outcome: false, sessionId: activeSessionId });
          playFailedSound();
        }
      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound();
      });
    });

    remainingGridItems.forEach((gridItem) => {
      let randomValue = generateRandomAlphanumeric();
      while (shuffledChosenItems.includes(randomValue)) {
        randomValue = generateRandomAlphanumeric();
      }
      applyCharacterFillingEffect(gridItem, randomValue);
      gridItem.classList.remove("selected");
      gridItem.classList.remove("wrong");

      gridItem.innerText = randomValue;

      gridItem.addEventListener("click", () => {
        let flashColor = "#a81515";
        let flashDuration = 200;
        let delayBetweenFlashes = 100;

        flashGridItem(gridItem, flashColor, flashDuration, delayBetweenFlashes);
        playErrorSound();
        clearInterval(timer);
        createAccessText(false);
        fetchNUI("hackingEnd", { outcome: false, sessionId: activeSessionId });
        playFailedSound();
      });

      gridItem.addEventListener("mouseenter", () => {
        playHoverSound();
      });
    });
  }
});

