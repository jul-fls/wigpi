Swal.fire({
  title: "Loading...",
  // text: 'Please wait while we fetch the data',
  allowEscapeKey: false,
  allowOutsideClick: false,
  didOpen: () => {
    swal.showLoading();
  },
});

fetch("https://wigpi.flusin.fr/api/classes/get_json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then((data) => {
    Swal.close(); // Close the Swal loading indicator
    const classSelect = document.getElementById("classSelect");

    data.classes.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.name;
      option.textContent = item.displayname;
      classSelect.appendChild(option);
    });

  })
  .catch((error) => {
    console.error("There has been a problem with your fetch operation:", error);
    Swal.fire(
      "Error",
      "There was a problem with your fetch operation.",
      "error"
    ); // Show error message
  });


  function createStatsTable(stats) {
    const table = document.createElement("table");
    table.className = "w-full bg-white rounded-lg shadow-lg p-6"; // Tailwind classes for neumorphism-like shadow

    // Create the header row
    const headerRow = document.createElement("tr");
    const headers = ["", "Total heures edt", "Total heures réalisées", "Total heures planifiées", "Répartition heures edt", "Pourcentage heures réalisées"];
    headers.forEach(header => {
        const th = document.createElement("th");
        th.className = "text-left p-4 border-b font-bold text-gray-700"; // Tailwind styles
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Create the data rows
    const statRows = [
        { name: "Bruges", data: stats.Bruges },
        { name: "Faure", data: stats.Faure },
        { name: "VISIO", data: stats.VISIO },
        { name: "Total", data: stats.Total }
    ];

    statRows.forEach(statRow => {
        const row = document.createElement("tr");
        const cellNames = [
            statRow.name,
            statRow.data.TotalHeuresEdt,
            statRow.data.TotalHeuresRealisees,
            statRow.data.TotalHeuresPlanifiees,
            Math.round(statRow.data.RepartitionHeuresEdt)+"%", // Round percentages
            Math.round(statRow.data.PourcentageHeuresRealisees)+"%"
        ];

        cellNames.forEach(cellValue => {
            const td = document.createElement("td");
            td.className = "p-4 text-gray-800 border-b"; // Tailwind classes
            td.textContent = cellValue;
            row.appendChild(td);
        });

        table.appendChild(row);
    });

    return table;
}


function refreshData(className) {
  Swal.fire({
    title: "Loading...",
    // text: 'Please wait while we fetch the data',
    allowEscapeKey: false,
    allowOutsideClick: false,
    didOpen: () => {
      swal.showLoading();
    },
  });

  fetch(`https://wigpi.flusin.fr/api/data/courses_data/${className}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      Swal.close(); // Close the Swal loading indicator
      const dataContainer = document.getElementById("dataContainer");

      dataContainer.innerHTML = ""; // Clear the container
      
      
      // Data freshness indicator
      const dataFreshnessIndicator = document.getElementById("dataFreshnessIndicator");
      dataContainer.innerHTML = ""; // Clear the container
      
      const dateTimestamp = new Date(parseInt(data.dataTimestamp));
      const now = new Date();

      // Calculate the time difference
      const diffMs = now - dateTimestamp;
      const diffMins = Math.floor((diffMs % 3600000) / 60000); // remaining minutes after full hours
      const diffHours = Math.floor(diffMs / 3600000); // full hours
      
      let dataFreshnessText = '';
      
      if (diffHours > 0) {
        // Display both hours and minutes if applicable
        dataFreshnessText = diffMins > 0 ? `${diffHours}h ${diffMins}m` : `${diffHours}h`;
      } else {
        dataFreshnessText = `${diffMins}m`; // Only display minutes if less than an hour
      }

      dataFreshnessIndicator.innerHTML = `Dernière mise à jour : Il y a ${dataFreshnessText}`;
      dataFreshnessIndicator.title = `Dernière mise à jour : ${dateTimestamp.toLocaleString()}`;

      // Create the stats table
      const statsContainer = document.getElementById("statsContainer");

      // Clear any existing data in the stats container
      statsContainer.innerHTML = '';

      // Create and append the stats table
      const statsTable = createStatsTable(data.stats);
      statsContainer.appendChild(statsTable);

      // Add the data to the container
      data.subjects.forEach((item) => {
        const module = document.createElement("div");
        module.className =
          "relative rounded-lg overflow-hidden  p-5 min-w-64 shadow-neumorphism ";

        // Add the module name
        const module_name = document.createElement("h1");

        item.subject.length > 19
          ? (module_name.className = "w-1/2 text-2xl font-bold mb-2")
          : (module_name.className = "text-2xl font-bold mb-2");

        module_name.textContent = item.subject;

        module.appendChild(module_name);

        // Helper function to create information paragraphs with icons
        function createInfoParagraph(iconClass, text, additionalClasses = "") {
          const paragraph = document.createElement("div");
          paragraph.className = `mb-4 ${additionalClasses}`;
          paragraph.innerHTML = `<i class="${iconClass} text-blue-500 mr-2"></i><span class="font-semibold">${text}</span>`;
          return paragraph;
        }

        // Add the module teachers
        const teacherNamesAndEmails = item.teachers
          .map((teacher) => {
            return `<a href="mailto:${teacher.email}" class="font-bold text-main hover:text-blue-800">${teacher.name}</a>`;
          })
          .join(", ");
        const teachersText =
          item.teachers.length > 0
            ? `Intervenant(s) : ${teacherNamesAndEmails}`
            : "Pas d'intervenant";
        module.appendChild(
          createInfoParagraph(
            "fas fa-chalkboard-teacher  text-secondary",
            teachersText
          )
        );

        // Add the module timespan
        module.appendChild(
          createInfoParagraph(
            "fas fa-calendar-alt text-secondary",
            `Dates : ${item.firstDate} 🡲 ${item.lastDate}`
          )
        );

        // Add the module nb of sessions
        module.appendChild(
          createInfoParagraph(
            "fas fa-school  text-secondary",
            `Sessions : ${item.sessions.realized} / ${item.sessions.total}`
          )
        );

        // Add the module hours realized vs total
        module.appendChild(
          createInfoParagraph(
            "fas fa-clock text-secondary",
            `Heures : ${item.hours.realized} / ${item.hours.total}`
          )
        );

        // Assume this is used inside your loop for each module after you've processed sessions_list and before appending the module
        addSessionsList(module, item.sessions.list);

        // Add the progress bar
        const module_progress = document.createElement("div");
        module_progress.className =
          "w-full bg-gray-200 rounded-full overflow-hidden h-6 mb-4"; // Adjusted height for visibility
        module_progress.title = `${item.percentageOfCompletion}% Complété`;

        const module_progress_inner = document.createElement("div");
        // Include the classes for the striped and animated background
        module_progress_inner.className =
          "progress-striped progress-animated bg-secondary h-full rounded-full text-center";
        module_progress_inner.style.width = `${item.percentageOfCompletion}%`;
        if(item.percentageOfCompletion > 0){
          module_progress_inner.innerText = `${item.percentageOfCompletion}%`;
        }
        module_progress.appendChild(module_progress_inner);
        module.appendChild(module_progress);

        // Session status icon
        const statusIcon = document.createElement("div");
        statusIcon.className = "status absolute top-0 right-0 m-5";
        if (item.sessions.realized === 0) {
          // Custom "calendar-lock" by stacking fa-calendar and fa-lock
          statusIcon.innerHTML = `
                        <span class="fa-layers fa-fw fa-2x" title="Non commencé">
                            <i class="fas fa-calendar text-gray-700"></i>
                            <i class="fas fa-lock text-white" data-fa-transform="shrink-8 down-3"></i>
                        </span>
                    `;
        } else if (item.sessions.realized < item.sessions.total) {
          statusIcon.innerHTML = `<i class="fas fa-calendar-day text-orange-500 fa-2x" title="En cours"></i>`;
        } else {
          statusIcon.innerHTML = `<i class="fas fa-calendar-check text-green-500 fa-2x" title="Terminé"></i>`;
        }
        module.appendChild(statusIcon);

        // Add the module visio icon with percentage
        if (item.hasVisio) {
          const module_visio_container = document.createElement("div");
          module_visio_container.className =
            "flex items-center justify-center mt-4";

          const module_visio = document.createElement("span");
          module_visio.className = "fa-layers fa-fw fa-2x text-gray-700 mr-2";
          module_visio.innerHTML = `<i class="fas fa-laptop" style="color:lightblue;"></i>
                                            <i class="fas fa-school" data-fa-transform="shrink-8" style="color:darkslategray;"></i>`;

          const visio_percentage = document.createElement("span");
          visio_percentage.className = "text-xl font-semibold";
          visio_percentage.textContent = `${item.percentageOfVisio}% Visio`;

          module_visio_container.appendChild(module_visio);
          module_visio_container.appendChild(visio_percentage);
          module.appendChild(module_visio_container);
        }else{
            // display the same thing but 100% presentiel icon
            const module_visio_container = document.createElement("div");
            module_visio_container.className =
              "flex items-center justify-center mt-4";

            const module_visio = document.createElement("span");
            module_visio.className = "fa-layers fa-fw fa-1x text-gray-700 mr-2";
            module_visio.innerHTML = `<i class="fas fa-school" style="color:darkslategray;"></i>`;

            const visio_percentage = document.createElement("span");
            visio_percentage.className = "text-xl font-semibold";
            visio_percentage.textContent = `100% Présentiel`;

            module_visio_container.appendChild(module_visio);
            module_visio_container.appendChild(visio_percentage);
            module.appendChild(module_visio_container);
        }

        dataContainer.appendChild(module);
      });
      // Update the UI with the new data
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
      Swal.fire(
        "Error",
        "There was a problem with your fetch operation.",
        "error"
      ); // Show error message
    });
}

function filterCardsByName(searchQuery) {
  document.querySelectorAll("#dataContainer > div").forEach((card) => {
    if (card.innerText.toLowerCase().includes(searchQuery.toLowerCase())) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function filterCardsByStatus() {
  const checkedStatuses = Array.from(document.querySelectorAll('#filterClassStatus input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
  
  document.querySelectorAll("#dataContainer > div").forEach((card) => {
    const statusIcons = card.querySelectorAll(".status");

    let showCard = false;
    statusIcons.forEach((statusIcon) => {
      if (checkedStatuses.length === 0) {
        showCard = true; // Show all cards if no checkbox is checked
      } else {
        checkedStatuses.forEach(status => {
          if (status === "Terminé" && statusIcon.innerHTML.includes("Terminé")) {
            showCard = true;
          } else if (status === "En cours" && statusIcon.innerHTML.includes("En cours")) {
            showCard = true;
          } else if (status === "Non commencé" && statusIcon.innerHTML.includes("Non commencé")) {
            showCard = true;
          }
        });
      }
    });

    card.style.display = showCard ? "block" : "none";
  });
}

function filterCardsByBatiment() {
  const checkedBatiments = Array.from(document.querySelectorAll('#filterClassBatiment input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

  document.querySelectorAll("#dataContainer > div").forEach((card) => {
    const BatimentInfos = card.querySelectorAll("div[batiment]");
    let showCard = false; // Initially hide the card

    // Loop through each session (BatimentInfo) inside the card
    BatimentInfos.forEach((BatimentInfo) => {
      const batimentValue = BatimentInfo.getAttribute("batiment");

      if (checkedBatiments.length === 0 || checkedBatiments.includes(batimentValue)) {
        // If no filter is selected or the batiment matches, show the session
        BatimentInfo.style.display = "";
        showCard = true; // At least one session matches, so show the card
      } else {
        // Hide the session if it doesn't match the selected batiment
        BatimentInfo.style.display = "none";
      }
    });

    // Show or hide the card based on whether any session within it was shown
    card.style.display = showCard ? "" : "none";
  });
}



// This function adds a collapsible session list under each module
// This function adds a collapsible session list under each module and displays the next planned session
function addSessionsList(module, sessions) {
  const sessionListContainer = document.createElement("div");
  sessionListContainer.className = "mb-4";

  // First, find the next planned session
  const nextPlannedSession = sessions.find(session => session.status === "planned");

  if (nextPlannedSession) {
    // Create a container to display the next planned session
    const nextSessionContainer = document.createElement("div");
    nextSessionContainer.className = "mb-4 p-3 bg-blue-100 rounded-lg";

    const nextSessionTitle = document.createElement("h2");
    nextSessionTitle.className = "font-bold text-lg text-blue-700 mb-2";
    nextSessionTitle.textContent = "Prochaine session planifiée :";

    const nextSessionInfo = document.createElement("div");
    nextSessionInfo.className = "flex items-center justify-between";
    nextSessionInfo.innerHTML = `${nextPlannedSession.date} - ${nextPlannedSession.startHour} 🡲 ${nextPlannedSession.endHour}`;

    if (
      nextPlannedSession.batiment &&
      nextPlannedSession.salle &&
      nextPlannedSession.batiment !== "VISIO" &&
      nextPlannedSession.salle !== "VISIO" &&
      nextPlannedSession.batiment !== "undefined" &&
      nextPlannedSession.salle !== "Aucune"
    ) {
      nextSessionInfo.innerHTML += `</br> (${nextPlannedSession.batiment} ${nextPlannedSession.salle})`;
    }else if(nextPlannedSession.batiment === "VISIO" || nextPlannedSession.salle === "VISIO"){
      nextSessionInfo.innerHTML += `</br> (Cours en visio)`;
    }

    nextSessionContainer.appendChild(nextSessionTitle);
    nextSessionContainer.appendChild(nextSessionInfo);
    module.appendChild(nextSessionContainer);
  }

  // Now create the toggle button and session list for "Liste des cours"
  const toggleButton = document.createElement("button");
  toggleButton.className = "flex items-center justify-between w-full mb-2"; // Adjust justify to 'justify-between'

  // Create span for the text "Liste des cours"
  const textSpan = document.createElement("span");
  textSpan.textContent = "Liste des cours :";
  toggleButton.appendChild(textSpan);

  // Create span for the icon
  const iconI = document.createElement("i");
  iconI.className = "fas fa-chevron-down"; // Start with down arrow
  toggleButton.appendChild(iconI);

  const sessionList = document.createElement("div");
  sessionList.className = "hidden"; // Start hidden, will be toggled by the button

  sessions.forEach((session) => {
    const sessionDiv = document.createElement("div");
    sessionDiv.className = "flex items-center justify-between";
    sessionDiv.setAttribute("batiment", session.batiment);

    const sessionInfo = document.createElement("span");
    sessionInfo.innerHTML = `${session.date} - ${session.startHour} 🡲 ${session.endHour}`;

    if (
      session.batiment &&
      session.salle &&
      session.batiment !== "VISIO" &&
      session.salle !== "VISIO" &&
      session.batiment !== "undefined" &&
      session.salle !== "Aucune"
    ) {
      sessionInfo.innerHTML += `</br> (${session.batiment} ${session.salle})`;
    }
    sessionDiv.appendChild(sessionInfo);

    if (session.isVisio) {
      const visioIconWrapper = document.createElement("span");
      visioIconWrapper.title = "Cours en visio sans lien EDT Teams";

      const visioIcon = document.createElement("i");
      visioIcon.className = "fas fa-video text-blue-500 ml-2"; // Add ml-2 for some spacing

      const VisioIconsDiv = document.createElement("div");
      VisioIconsDiv.className = "flex items-center";

      VisioIconsDiv.appendChild(visioIcon);

      if (session.teamslink) {
        const visioTeamsLinkIcon = document.createElement("a");
        visioTeamsLinkIcon.href = session.teamslink;
        visioTeamsLinkIcon.className = "px-2";
        visioTeamsLinkIcon.target = "_blank"; // Ensures the link opens in a new tab

        const teamsIcon = document.createElement("img");
        teamsIcon.src = "https://cdn.simpleicons.org/microsoftteams/6264a7ff";
        teamsIcon.alt = "Microsoft Teams";
        teamsIcon.className = "h-5 w-5";
        visioTeamsLinkIcon.appendChild(teamsIcon);
        VisioIconsDiv.appendChild(visioTeamsLinkIcon);
      }
      visioIconWrapper.appendChild(VisioIconsDiv);
      sessionDiv.appendChild(visioIconWrapper);
    } else {
      const schoolIcon = document.createElement("i");
      schoolIcon.className = "fas fa-school text-secondary ml-2";
      schoolIcon.title = "Cours en présentiel";
      sessionDiv.appendChild(schoolIcon);
    }

    const statusIcon = document.createElement("i");
    switch (session.status) {
      case "done":
        statusIcon.className = "fas fa-check text-green-500";
        break;
      case "in progress":
        statusIcon.className = "fas fa-hourglass-half text-orange-500";
        break;
      case "planned":
        statusIcon.className = "fas fa-lock text-gray-500";
        break;
    }
    sessionDiv.appendChild(statusIcon);

    sessionList.appendChild(sessionDiv);
  });

  // Add event listener to toggle the icon and visibility
  toggleButton.addEventListener("click", () => {
    sessionList.classList.toggle("hidden"); // Toggle visibility of sessionList, not sessionListContainer
    let icon = toggleButton.querySelector("svg");
    if (sessionList.classList.contains("hidden")) {
      icon.classList.remove("fa-chevron-up");
      icon.classList.add("fa-chevron-down");
    } else {
      icon.classList.remove("fa-chevron-down");
      icon.classList.add("fa-chevron-up");
    }
  });

  sessionListContainer.appendChild(toggleButton);
  sessionListContainer.appendChild(sessionList);

  module.appendChild(sessionListContainer);
}
