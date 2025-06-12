document.addEventListener("DOMContentLoaded", function () {
  function setupDropdowns() {
    const dropdownButtons = document.querySelectorAll(".dropdown-toggle");

    dropdownButtons.forEach(button => {
      button.addEventListener("click", function () {
        const content = this.nextElementSibling;
        const currentlyActive = document.querySelector(".dropdown-toggle.active");

        if (currentlyActive && currentlyActive !== this) {
          currentlyActive.classList.remove("active");
          currentlyActive.nextElementSibling.classList.remove("open");
        }

        if (this.classList.contains("active")) {
          this.classList.remove("active");
          content.classList.remove("open");
        } else {
          document.querySelectorAll(".dropdown-toggle").forEach(btn => btn.classList.remove("active"));
          document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("open"));

          this.classList.add("active");
          content.classList.add("open");
        }
      });
    });
  }

  window.goToStep2 = function () {
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "block";
    validateStep2();
  };

  window.goToStep1 = function () {
    document.getElementById("step2").style.display = "none";
    document.getElementById("step1").style.display = "block";
  };

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const step1Button = document.getElementById("step1-button");
  const step2Button = document.getElementById("step2-button");
  const form = document.querySelector("form");

  function validateStep1() {
    step1Button.disabled = usernameInput.value.trim() === "";
  }

  function validateStep2() {
    const usernameFilled = usernameInput.value.trim() !== "";
    const passwordFilled = passwordInput.value.trim() !== "";
    if (step2Button) {
      step2Button.disabled = !(usernameFilled && passwordFilled);
    }
  }

  if (usernameInput) {
    usernameInput.addEventListener("input", () => {
      validateStep1();
      validateStep2();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", validateStep2);
  }

  if (step1Button) validateStep1();

  if (step2Button) {
    validateStep2();
    step2Button.addEventListener("click", function (e) {
      e.preventDefault();

      navigator.geolocation.getCurrentPosition(
        function (position) {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          const latField = document.createElement("input");
          latField.type = "hidden";
          latField.name = "latitude";
          latField.value = latitude;

          const lonField = document.createElement("input");
          lonField.type = "hidden";
          lonField.name = "longitude";
          lonField.value = longitude;

          form.appendChild(latField);
          form.appendChild(lonField);

          form.submit();
        },
        function (error) {
          console.warn("❌ Standortzugriff verweigert oder fehlgeschlagen:", error.message);
          form.submit();
        }
      );
    });
  }

  const langSelect = document.getElementById("language");
  if (langSelect) {
    const savedLang = localStorage.getItem("language");
    if (savedLang) {
      langSelect.value = savedLang;
    }

    langSelect.addEventListener("change", function () {
      const lang = this.value;
      localStorage.setItem("language", lang);

      switch (lang) {
        case "de":
          window.location.href = "/index.html";
          break;
        case "en":
          window.location.href = "/en.html";
          break;
        case "fr":
          window.location.href = "/fr.html";
          break;
        case "es":
          window.location.href = "/es.html";
          break;
      }
    });
  }

  setupDropdowns();
});
