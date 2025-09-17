# Recipe App - Initial Rough Idea

This is a project which will be used by faculties and learners in a modern engineering graduate training programme spanning 10 days. 

I want you to build a Node.js, React and PostgreSQL based recipe app. The key is that this app is being built to educate graduates. So as you build, create new branches showing logical separation. 
i.e. Branch called step 1 may just have a basic skeleton of the app showing e2e connectivity. 

Branch called step 2 may have more features with some APIs

Branch called step 3 may have the full app.

Branch called step 4 may have GenAI capabilities that I'll describe below. 

This will help students and faculties. Write well documented code and create a faculty and student notes as you progress. 

Don't commit the .amazonq, prompts and your research/design/prompt files - so add those to .gitignore.

You must should start with a database layer - create a data model for postgreSQL. The user must be able to find recipes based on the ingredients they have, they must be able to edit recipes and add new recipes. Think of more interesting concepts and features for the app but keep it simple, maybe a feature where the app recommends recipes requiring minimal shopping i.e. maximising existing groceries or a feature where the app can generate a list of shopping things based on recipes the user wants to eat over a week. 

Generate a JSON with 20 hard coded recipes. 

On the data front, generate a data model - I don't want an authentication system. We must be able to store user's preferences, recipes, favourites, recipe versions for edited recipes...anything else that might be needed to make the project interesting. 

Then appropriately design an Express server and React frontend. Use interactive and modern looking design library to make the project interesting for the students. 

Follow standards and ensure you build the project in a way where students can learn from it. 

Lastly, I want a Python layer, where the hardcoded 20 recipes which sit in a JSON file and be ingested into the PostgreSQL database showing a bit of ETL. Put this script in a separate scripts folder. 

Ensure you create readmes and please change your branches at key points. 

Lastly, as a last step of the project, create a way for the participants to use GenerativeAI to create recipes based on the ingredients they have. Use OpenAI library for it, I'll pass the API Key for OpenAI in a .env file where you tell me to. This is a final step to make the project interesting. 

You're currently on main branch, but create step by step branches as you continue - break your work into 5 branches max.