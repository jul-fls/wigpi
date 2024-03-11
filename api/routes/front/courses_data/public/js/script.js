Swal.fire({
    title: 'Loading...',
    // text: 'Please wait while we fetch the data',
    allowEscapeKey: false,
    allowOutsideClick: false,
    didOpen: () => {
        swal.showLoading();
    },
});

fetch('/api/classes/get_json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        Swal.close(); // Close the Swal loading indicator
        const classSelect = document.getElementById('classSelect');
        data.classes.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = item.displayname;
            classSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
        Swal.fire('Error', 'There was a problem with your fetch operation.', 'error'); // Show error message
    });

function refreshData(className) {
    Swal.fire({
        title: 'Loading...',
        // text: 'Please wait while we fetch the data',
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
            swal.showLoading();
        },
    });

    fetch(`/api/data/courses_data/${className}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            Swal.close(); // Close the Swal loading indicator
            const dataContainer = document.getElementById('dataContainer');
            dataContainer.innerHTML = ''; // Clear the container
            data.forEach(item => {
                const module = document.createElement('div');
                module.className = 'relative rounded-lg overflow-hidden shadow-lg bg-white m-4 p-6'; // Added 'relative' here

                // Add the module name
                const module_name = document.createElement('h1');
                module_name.className = 'text-2xl font-bold mb-2';
                module_name.textContent = item.subject;
                module.appendChild(module_name);

                // Helper function to create information paragraphs with icons
                function createInfoParagraph(iconClass, text, additionalClasses = "") {
                    const paragraph = document.createElement('div');
                    paragraph.className = `mb-4 ${additionalClasses}`;
                    paragraph.innerHTML = `<i class="${iconClass} text-blue-500 mr-2"></i><span class="font-semibold">${text}</span>`;
                    return paragraph;
                }

                // Add the module teachers
                const teacherNamesAndEmails = item.teachers.map(teacher => {
                    return `<a href="mailto:${teacher.email}" class="text-blue-600 hover:text-blue-800">${teacher.name}</a>`;
                }).join(', ');
                const teachersText = item.teachers.length > 0 ? `Intervenant(s) : ${teacherNamesAndEmails}` : "Pas d'intervenant";
                module.appendChild(createInfoParagraph('fas fa-chalkboard-teacher', teachersText));


                // Add the module timespan
                module.appendChild(createInfoParagraph('fas fa-calendar-alt', `Dates : ${item.firstDate} -> ${item.lastDate}`));

                // Add the module nb of sessions
                module.appendChild(createInfoParagraph('fas fa-school', `Sessions : ${item.sessions.realized} / ${item.sessions.total}`));

                // Add the module hours realized vs total
                module.appendChild(createInfoParagraph('fas fa-clock', `Heures : ${item.hours.realized} / ${item.hours.total}`));

                // Assume this is used inside your loop for each module after you've processed sessions_list and before appending the module
                addSessionsList(module, item.sessions.list);

                // Add the progress bar
                const module_progress = document.createElement('div');
                module_progress.className = 'w-full bg-gray-200 rounded-full overflow-hidden h-2 mb-4'; // Adjusted height for visibility
                module_progress.title = `${item.percentageOfCompletion}% Complété`;

                const module_progress_inner = document.createElement('div');
                // Include the classes for the striped and animated background
                module_progress_inner.className = 'progress-striped progress-animated bg-blue-500 h-full rounded-full'; 
                module_progress_inner.style.width = `${item.percentageOfCompletion}%`;
                module_progress.appendChild(module_progress_inner);
                module.appendChild(module_progress);

                // Session status icon
                const statusIcon = document.createElement('div');
                statusIcon.className = 'absolute top-0 right-0 m-1';
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
                if(item.hasVisio){
                    const module_visio_container = document.createElement('div');
                    module_visio_container.className = 'flex items-center justify-center mt-4';

                    const module_visio = document.createElement('span');
                    module_visio.className = 'fa-layers fa-fw fa-2x text-gray-700 mr-2';
                    module_visio.innerHTML = `<i class="fas fa-laptop" style="color:lightblue;"></i>
                                            <i class="fas fa-school" data-fa-transform="shrink-8" style="color:darkslategray;"></i>`;
                                            
                    const visio_percentage = document.createElement('span');
                    visio_percentage.className = 'text-xl font-semibold';
                    visio_percentage.textContent = `${item.percentageOfVisio}% Visio`;

                    module_visio_container.appendChild(module_visio);
                    module_visio_container.appendChild(visio_percentage);
                    module.appendChild(module_visio_container);
                }

                dataContainer.appendChild(module);
            });
            // Update the UI with the new data
        })
        .catch(error => {
            console.error('There has been a problem with your fetch operation:', error);
            Swal.fire('Error', 'There was a problem with your fetch operation.', 'error'); // Show error message
        });
}

// This function adds a collapsible session list under each module
function addSessionsList(module, sessions) {
    const sessionListContainer = document.createElement('div');
    sessionListContainer.className = 'mb-4';

    const toggleButton = document.createElement('button');
    toggleButton.className = 'flex items-center justify-between w-full mb-2'; // Adjust justify to 'justify-between'

    // Create span for the text "Liste des cours"
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Liste des cours :';
    toggleButton.appendChild(textSpan);

    // Create span for the icon
    const iconI = document.createElement('i');
    iconI.className = 'fas fa-chevron-down'; // Start with down arrow
    toggleButton.appendChild(iconI);

    const sessionList = document.createElement('div');
    sessionList.className = 'hidden'; // Start hidden, will be toggled by the button

    sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'flex items-center justify-between';

        const sessionInfo = document.createElement('span');
        sessionInfo.innerHTML = `${session.date} - ${session.startHour} -> ${session.endHour}`;
        sessionDiv.appendChild(sessionInfo);

        // Part of the loop where you add each session to the sessionsContainer
        if (session.isVisio) {
            const visioIconWrapper = session.teamslink ? document.createElement('a') : document.createElement('span');
            visioIconWrapper.title = "Cours en visio sans lien EDT Teams";
            if (session.teamslink) {
                visioIconWrapper.href = session.teamslink;
                visioIconWrapper.target = "_blank"; // Ensures the link opens in a new tab
                // add a mouse cursor to indicate the link is clickable
                visioIconWrapper.style.cursor = "pointer";
                visioIconWrapper.title = "Cours en visio avec lien EDT Teams";
            }
            const visioIcon = document.createElement('i');
            visioIcon.className = 'fas fa-video text-blue-500 ml-2'; // Add ml-2 for some spacing

            visioIconWrapper.appendChild(visioIcon);
            sessionDiv.appendChild(visioIconWrapper);
        }else{
            // add a school icon
            const schoolIcon = document.createElement('i');
            schoolIcon.className = 'fas fa-school text-blue-500 ml-2'; // Add ml-2 for some spacing
            schoolIcon.title = "Cours en présentiel";
            sessionDiv.appendChild(schoolIcon);
        }

        const statusIcon = document.createElement('i');
        switch(session.status) {
            case 'done':
                statusIcon.className = 'fas fa-check text-green-500';
                break;
            case 'in progress':
                statusIcon.className = 'fas fa-hourglass-half text-orange-500';
                break;
            case 'planned':
                statusIcon.className = 'fas fa-lock text-gray-500';
                break;
        }
        sessionDiv.appendChild(statusIcon);

        sessionList.appendChild(sessionDiv);
    });

    // Add event listener to toggle the icon and visibility
    toggleButton.addEventListener('click', () => {
        sessionList.classList.toggle('hidden'); // Toggle visibility of sessionList, not sessionListContainer
        // Toggle the icon between down and up
        let icon = toggleButton.querySelector('svg'); // Ensure you're selecting the icon within iconSpan
        if (sessionList.classList.contains('hidden')) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        } else {
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        }
    });

    sessionListContainer.appendChild(toggleButton);
    sessionListContainer.appendChild(sessionList);

    module.appendChild(sessionListContainer);
}