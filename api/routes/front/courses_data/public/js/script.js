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
                module.className = 'relative max-w-sm rounded-lg overflow-hidden shadow-lg bg-white m-4 p-6'; // Added 'relative' here

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